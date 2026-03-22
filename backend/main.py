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
    db: Session = Depends(database.get_db) # inject a DB session
):
    # ── Step 1: Create a unique ID for this deployment ──
    app_id = str(uuid.uuid4())[:8]   # e.g. "a3f2b1c9"
    app_dir = os.path.join(BASE_DEPLOYMENTS_DIR, f"app-{app_id}")
    os.makedirs(app_dir, exist_ok=True)

    # ── Step 2: Validate it's a ZIP file ────────────────
    if not file.filename.endswith(".zip"):
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
        status=models.DeploymentStatus.BUILDING,
        image_name=image_name,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)  # reload to get the auto-generated id

    # ── Step 7: Generate and write the Dockerfile ───────
    dockerfile_content, container_port = generate_dockerfile(deploy_type)
    dockerfile_path = os.path.join(app_dir, "Dockerfile")
    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)

    # ── Step 8: Build the Docker image ──────────────────
    # subprocess.run() runs a shell command and waits for it to finish
    # capture_output=True captures stdout/stderr so we can read them
    build_result = subprocess.run(
        ["docker", "build", "-t", image_name, "."],
        cwd=app_dir,                  # run the command FROM the app_dir
        capture_output=True,
        text=True,                    # return output as string, not bytes
        timeout=300                   # max 5 minutes to build
    )

    if build_result.returncode != 0:
        # Build failed — save the error and mark as FAILED
        # .value converts the enum to its string: DeploymentStatus.FAILED → "FAILED"
        # This is needed because the DB column is a plain String, not an Enum column
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = build_result.stderr[-1000:]  # last 1000 chars of error
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Docker build failed: {build_result.stderr[-500:]}"
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
        # Guard against empty container_id with 'or ""'
        "container_id": (container_id or "")[:12],
    }


# ─────────────────────────────────────────────────────────
# ROUTE 3: List all deployments
# GET /api/deployments
#
# Returns all deployments in the database, newest first.
# The frontend dashboard calls this to show the list of apps.
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments")
def list_deployments(db: Session = Depends(database.get_db)):
    deployments = (
        db.query(models.Deployment)
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
def delete_deployment(deployment_id: int, db: Session = Depends(database.get_db)):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id
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
def get_logs(deployment_id: int, db: Session = Depends(database.get_db)):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id
    ).first()

    if not deployment or not deployment.container_id:
        raise HTTPException(status_code=404, detail="Deployment not found")

    result = subprocess.run(
        ["docker", "logs", "--tail", "100", deployment.container_id],
        capture_output=True,
        text=True
    )

    return {
        "logs": result.stdout + result.stderr
    }
