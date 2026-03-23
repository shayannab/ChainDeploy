# ─────────────────────────────────────────────────────────
# main.py — The FastAPI application entry point
#
# This is where all our HTTP routes/endpoints live.
# When the frontend sends a request, it hits one of these routes.
#
# FastAPI automatically generates interactive docs at:
#   http://localhost:8000/docs
# You can test every endpoint there without writing any code.
# ─────────────────────────────────────────────────────────

import os
import uuid
import socket
import zipfile
import shutil
import subprocess
import tempfile

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
import models
import auth
from detector import detect_project_type
from dockerfile_generator import generate_dockerfile

# ── App initialization ───────────────────────────────────
app = FastAPI(
    title="ChainDeploy API",
    description="Deploy Web3 dApps and any code project in seconds.",
    version="1.0.0"
)

# ── CORS Middleware ──────────────────────────────────────
# CORS = Cross-Origin Resource Sharing
# Browsers block requests from one "origin" (e.g. localhost:5173)
# to another (e.g. localhost:8000) by default — this is a security feature.
# We tell FastAPI to ALLOW requests from our React frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],   # allow GET, POST, DELETE, etc.
    allow_headers=["*"],
)

# ── Create all database tables on startup ────────────────
# This reads models.py and creates any missing tables.
# It's safe to call even if tables already exist — it won't overwrite.
models.Base.metadata.create_all(bind=database.engine)

# ── Base directory for extracted user apps ───────────────
# tempfile.gettempdir() returns the correct temp folder for ANY OS:
#   Windows → C:\Users\<user>\AppData\Local\Temp
#   Linux   → /tmp
#   Mac     → /var/folders/...
BASE_DEPLOYMENTS_DIR = os.path.join(tempfile.gettempdir(), "chaindeploy")
os.makedirs(BASE_DEPLOYMENTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────
# Helper: find an open TCP port on the host machine
#
# We start searching from port 3100 and increment until we
# find one that nothing is listening on.
# ─────────────────────────────────────────────────────────
def find_free_port(start: int = 3100) -> int:
    port = start
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            # try_to_connect returns 0 if port is OPEN (occupied), non-zero if free
            if s.connect_ex(("localhost", port)) != 0:
                return port  # this port is free!
        port += 1


# ─────────────────────────────────────────────────────────
# ROUTE 1: Health check
# GET /api/health
#
# Simple endpoint — just confirms the server is alive.
# Used by Docker's health check and the frontend.
# ─────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ChainDeploy API"}

# ─────────────────────────────────────────────────────────
# AUTH ROUTE 1: Get Nonce
# POST /api/auth/nonce
# ─────────────────────────────────────────────────────────
@app.post("/api/auth/nonce")
def get_nonce(address: str, db: Session = Depends(database.get_db)):
    # Check if user exists, if not create them
    user = db.query(models.User).filter(
        models.User.address == address.lower()
    ).first()
    
    if not user:
        user = models.User(address=address.lower())
        db.add(user)
        db.commit()
    
    # Generate new nonce
    nonce = auth.generate_nonce()
    user.nonce = nonce
    db.commit()
    
    return {"nonce": nonce}

# ─────────────────────────────────────────────────────────
# AUTH ROUTE 2: Verify Signature & Login
# POST /api/auth/verify
# ─────────────────────────────────────────────────────────
@app.post("/api/auth/verify")
def verify(
    address: str = Form(...), 
    signature: str = Form(...),
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(
        models.User.address == address.lower()
    ).first()
    
    if not user or not user.nonce:
        raise HTTPException(status_code=400, detail="Nonce not generated for this address")
    
    # Verify the signature
    if not auth.verify_ethereum_signature(address, signature, user.nonce):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Clear nonce after use
    user.nonce = None
    db.commit()
    
    # Create JWT token
    access_token = auth.create_access_token(data={"sub": user.address})
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────
# ROUTE 2: Deploy an app
# POST /api/deploy
#
# This is the main endpoint. It:
# 1. Accepts a ZIP file + optional project name
# 2. Extracts it to a temp folder
# 3. Detects the project type
# 4. Writes a Dockerfile
# 5. Builds the Docker image
# 6. Runs the container on a free port
# 7. Saves everything to the database
# 8. Returns the deployment info (including URL)
# ─────────────────────────────────────────────────────────
@app.post("/api/deploy")
async def deploy_app(
    file: UploadFile = File(...),           # the uploaded ZIP file
    project_name: str = Form("my-dapp"),   # optional name from the form
    db: Session = Depends(database.get_db), # inject a DB session
    current_user: models.User = Depends(auth.get_current_user) # Require auth
):
    # ── Step 1: Create a unique ID for this deployment ──
    app_id = str(uuid.uuid4())[:8]   # e.g. "a3f2b1c9"
    app_dir = os.path.join(BASE_DEPLOYMENTS_DIR, f"app-{app_id}")
    os.makedirs(app_dir, exist_ok=True)

    # ── Step 2: Validate it's a ZIP file ────────────────
    if not (file.filename or "").endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    # ── Step 3: Save the ZIP to disk ────────────────────
    zip_path = os.path.join(app_dir, "upload.zip")
    with open(zip_path, "wb") as f:
        contents = await file.read()  # await because file reading is async
        f.write(contents)

    # ── Step 4: Extract the ZIP ─────────────────────────
    # zipfile.ZipFile opens the archive
    # .extractall() unpacks everything into app_dir
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(app_dir)
        os.remove(zip_path)  # delete the raw ZIP, we have the extracted files

        # If the ZIP contained a single top-level folder, move its contents up
        # e.g. my-app.zip → my-app/ → [files]
        # We want app_dir to directly contain the files, not a subfolder.
        items = os.listdir(app_dir)
        if len(items) == 1 and os.path.isdir(os.path.join(app_dir, items[0])):
            nested_dir = os.path.join(app_dir, items[0])
            for item in os.listdir(nested_dir):
                shutil.move(os.path.join(nested_dir, item), app_dir)
            os.rmdir(nested_dir)

    except zipfile.BadZipFile:
        shutil.rmtree(app_dir)  # clean up on error
        raise HTTPException(status_code=400, detail="Invalid or corrupted ZIP file")

    # ── Step 5: Detect the project type ─────────────────
    deploy_type = detect_project_type(app_dir)

    # ── Step 6: Create a DB record (status = PENDING) ───
    image_name = f"chaindeploy-app-{app_id}"
    deployment = models.Deployment(
        project_name=project_name,
        deploy_type=deploy_type.value,
        status=models.DeploymentStatus.BUILDING.value,
        image_name=image_name,
        owner_id=current_user.id # Link to owner
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)  # reload to get the auto-generated id

    # ── Step 7: Generate and write the Dockerfile ───────
    dockerfile_content, container_port = generate_dockerfile(deploy_type, app_dir)

    dockerfile_path = os.path.join(app_dir, "Dockerfile")
    # FIX: Use encoding="utf-8" for Windows compatibility
    with open(dockerfile_path, "w", encoding="utf-8") as f:
        f.write(dockerfile_content)

    # ── Step 8: Build the Docker image ──────────────────
    # subprocess.run() runs a shell command and waits for it to finish
    # capture_output=True captures stdout/stderr so we can read them
    try:
        build_result = subprocess.run(
            ["docker", "build", "-t", image_name, "."],
            cwd=app_dir,                  # run the command FROM the app_dir
            capture_output=True,
            text=True,                    # return output as string, not bytes
            timeout=600                   # max 10 minutes to build
        )
    except subprocess.TimeoutExpired as e:
        # FIX: Use .value to convert enum to string
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = f"Docker build timed out after 10 minutes. Please ensure your dependencies are correct."
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Docker build timed out."
        )
    except Exception as e:
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    if build_result.returncode != 0:
        # Build failed — save the error and mark as FAILED
        # FIX: Use .value to convert enum to string
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = str(build_result.stderr or "")[-1000:]  # last 1000 chars of error
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Docker build failed: {str(build_result.stderr or '')[-500:]}"
        )

    # ── Step 9: Find a free host port ───────────────────
    host_port = find_free_port()

    # ── Step 10: Run the container ───────────────────────
    # -d              = detached mode (run in background)
    # -p HOST:CONTAINER = map host port to container port
    # --name          = give the container a name so we can manage it later
    run_result = subprocess.run(
        [
            "docker", "run", "-d",
            "-p", f"{host_port}:{container_port}",
            "--name", f"chaindeploy-{app_id}",
            # Pass .env file through if it exists in the uploaded project
            *(["--env-file", os.path.join(app_dir, ".env")]
              if os.path.exists(os.path.join(app_dir, ".env")) else []),
            image_name
        ],
        capture_output=True,
        text=True,
        timeout=30
    )

    if run_result.returncode != 0:
        # FIX: Use .value to convert enum to string
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = run_result.stderr
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Docker run failed: {run_result.stderr}"
        )

    # ── Step 11: Save success info to database ──────────
    container_id = run_result.stdout.strip()   # Docker prints the container ID
    url = f"http://localhost:{host_port}"

    # FIX: Use .value to convert enum to string
    deployment.status = models.DeploymentStatus.RUNNING.value
    deployment.port = host_port
    deployment.container_id = container_id
    deployment.url = url
    db.commit()

    # ── Clean up the source files (image is already built) ──
    shutil.rmtree(app_dir, ignore_errors=True)

    # ── Return the deployment info to the frontend ───────
    return {
        "id": deployment.id,
        "project_name": deployment.project_name,
        "deploy_type": deployment.deploy_type,
        "status": deployment.status,
        "url": url,
        "port": host_port,
        "container_id": str(container_id)[:12],
    }


# ─────────────────────────────────────────────────────────
# ROUTE 3: List all deployments
# GET /api/deployments
#
# Returns all deployments in the database, newest first.
# The frontend dashboard calls this to show the list of apps.
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments")
def list_deployments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployments = (
        db.query(models.Deployment)
        .filter(models.Deployment.owner_id == current_user.id) # Filter by owner
        .order_by(models.Deployment.created_at.desc())  # newest first
        .all()
    )
    return deployments


# ─────────────────────────────────────────────────────────
# ROUTE 4: Stop and delete a deployment
# DELETE /api/deployments/{deployment_id}
#
# Stops the Docker container and removes it from the DB.
# ─────────────────────────────────────────────────────────
@app.delete("/api/deployments/{deployment_id}")
def delete_deployment(
    deployment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id # Ensure ownership
    ).first()

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Stop and remove the Docker container if it's running
    if deployment.container_id:
        subprocess.run(["docker", "stop", deployment.container_id],
                      capture_output=True)
        subprocess.run(["docker", "rm", deployment.container_id],
                      capture_output=True)

    db.delete(deployment)
    db.commit()

    return {"message": f"Deployment {deployment_id} deleted successfully"}


# ─────────────────────────────────────────────────────────
# ROUTE 5: Get logs from a running container
# GET /api/deployments/{deployment_id}/logs
#
# Returns the last 100 lines of container logs.
# Useful for debugging failed or misbehaving deployments.
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments/{deployment_id}/logs")
def get_logs(
    deployment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id # Ensure ownership
    ).first()

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.status == models.DeploymentStatus.BUILDING.value:
        return {"logs": "Building image... This typically takes 30-90 seconds. Please wait.\nFetching layers...\nInstalling dependencies...\nExecuting docker build..."}

    if deployment.status == models.DeploymentStatus.FAILED.value:
        return {"logs": f"Build Failed:\n\n{deployment.error or 'Unknown error occurred.'}"}

    if not deployment.container_id:
        return {"logs": "Container ID not set. Please contact support."}

    result = subprocess.run(
        ["docker", "logs", "--tail", "100", deployment.container_id],
        capture_output=True,
        text=True
    )

    return {
        "logs": result.stdout + result.stderr
    }