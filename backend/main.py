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
from datetime import datetime, timedelta
import json
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
import models
import auth
from detector import detect_project_type
from dockerfile_generator import generate_dockerfile
try:
    from qie_deployer import deploy_to_qie
except ImportError:
    from .qie_deployer import deploy_to_qie

# ── App initialization ───────────────────────────────────
app = FastAPI(
    title="ChainDeploy API",
    description="Deploy Web3 dApps and any code project in seconds.",
    version="1.0.0"
)

# ── CORS Middleware ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Create all database tables on startup ────────────────
models.Base.metadata.create_all(bind=database.engine)

# ── Base directory for extracted user apps ───────────────
BASE_DEPLOYMENTS_DIR = os.path.join(tempfile.gettempdir(), "cd")
os.makedirs(BASE_DEPLOYMENTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────
# Helper: find an open TCP port on the host machine
# ─────────────────────────────────────────────────────────
def find_free_port(start: int = 3100) -> int:
    port = start
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port
        port += 1


# ─────────────────────────────────────────────────────────
# Helper: Run compilation for Hardhat/Foundry
# ─────────────────────────────────────────────────────────
def compile_project(app_dir: str, deploy_type: models.DeploymentType, log_file=None) -> tuple[bool, str]:
    """
    Returns (True, "") if compilation succeeds, (False, error_msg) otherwise.
    """
    if deploy_type == models.DeploymentType.HARDHAT:
        print(f"Compiling Hardhat project in {app_dir}...")
        
        # ── Step 0: Ensure package.json exists ──
        pkg_path = os.path.join(app_dir, "package.json")
        if not os.path.exists(pkg_path):
            print(f"DEBUG: package.json missing, generating it at {pkg_path}")
            minimal_pkg = {
                "name": "hardhat-project",
                "version": "1.0.0",
                "devDependencies": {
                    "hardhat": "^2.19.0",
                    "@nomicfoundation/hardhat-toolbox": "^4.0.0"
                }
            }
            import json
            with open(pkg_path, "w", encoding="utf-8") as f:
                json.dump(minimal_pkg, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            print(f"DEBUG: package.json created. Size: {os.path.getsize(pkg_path)}")

        if not os.path.exists(os.path.join(app_dir, "node_modules")):
            if log_file:
                log_file.write("DEBUG: node_modules missing, running 'npm install'...\n")
                log_file.flush()
            subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=app_dir, shell=True, stdout=log_file, stderr=log_file)
        
        # ── Step 0: Ensure hardhat is available ──
        hh_bin = os.path.join(app_dir, "node_modules", ".bin", "hardhat")
        if os.name == "nt":
            hh_bin += ".cmd"
        
        if not os.path.exists(hh_bin):
            print(f"DEBUG: {hh_bin} missing, falling back to npx", flush=True)
            cmd = ["npx", "--yes", "hardhat", "compile"]
        else:
            cmd = [hh_bin, "compile"]

        # ── Step 1: Run compilation ──
        env = {**os.environ, "HARDHAT_DISABLE_TELEMETRY": "true"}
        print(f"Executing: {' '.join(cmd)}", flush=True)
        try:
            result = subprocess.run(
                cmd,
                cwd=app_dir,
                stdout=log_file if log_file else None,
                stderr=log_file if log_file else None,
                shell=True,
                timeout=300,
                env=env
            )
            if result.returncode != 0:
                print(f"ERROR: Hardhat compile failed with code {result.returncode}", flush=True)
                return False, f"Hardhat compilation failed with code {result.returncode}"
        except subprocess.TimeoutExpired:
            print("ERROR: Hardhat compilation timed out after 5 minutes", flush=True)
            return False, "Hardhat compilation timed out"
        except Exception as e:
            print(f"ERROR: Hardhat compilation error: {str(e)}", flush=True)
            return False, f"Compilation error: {str(e)}"

        print("DEBUG: Hardhat compilation successful", flush=True)
        return True, ""
        
    elif deploy_type == models.DeploymentType.FOUNDRY:
        if log_file:
            log_file.write(f"Running 'forge build' in {app_dir}...\n")
            log_file.flush()
        result = subprocess.run(
            ["forge", "build"],
            cwd=app_dir,
            stdout=log_file if log_file else None,
            stderr=log_file if log_file else None,
            shell=True # For Windows
        )
        if result.returncode != 0:
            return False, "Foundry compilation failed (check terminal output)"
        return True, ""
        
    return True, ""


def extract_abi(app_dir: str, deploy_type: models.DeploymentType) -> str:
    """
    Search for ABI in Hardhat (artifacts/) or Foundry (out/) and return it as a JSON string.
    """
    try:
        abi_list = []
        if deploy_type == models.DeploymentType.HARDHAT:
            artifacts_dir = os.path.join(app_dir, "artifacts", "contracts")
            if os.path.exists(artifacts_dir):
                for root, _, files in os.walk(artifacts_dir):
                    for file in files:
                        if file.endswith(".json") and not file.endswith(".dbg.json"):
                            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                                data = json.load(f)
                                if isinstance(data, dict) and "abi" in data and data["abi"]:
                                    abi_list.append(data["abi"])

        elif deploy_type == models.DeploymentType.FOUNDRY:
            out_dir = os.path.join(app_dir, "out")
            if os.path.exists(out_dir):
                for root, _, files in os.walk(out_dir):
                    for file in files:
                        if file.endswith(".json"):
                            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                                data = json.load(f)
                                if isinstance(data, dict) and "abi" in data and data["abi"]:
                                    abi_list.append(data["abi"])

        if abi_list:
            # Simple heuristic: the largest ABI is probably the primary contract
            primary_abi = max(abi_list, key=len)
            return json.dumps(primary_abi)
            
    except Exception as e:
        print(f"DEBUG: ABI extraction failed: {e}")
    
    return ""


# ─────────────────────────────────────────────────────────
# ROUTE 1: Health check
# ─────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ChainDeploy API"}

# ─────────────────────────────────────────────────────────
# AUTH ROUTE 1: Get Nonce
# ─────────────────────────────────────────────────────────
@app.post("/api/auth/nonce")
def get_nonce(address: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        models.User.address == address.lower()
    ).first()
    
    if not user:
        user = models.User(address=address.lower())
        db.add(user)
        db.commit()
    
    nonce = auth.generate_nonce()
    user.nonce = nonce
    db.commit()
    
    return {"nonce": nonce}

# ─────────────────────────────────────────────────────────
# AUTH ROUTE 2: Verify Signature & Login
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
    
    if not auth.verify_ethereum_signature(address, signature, user.nonce):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    user.nonce = None
    db.commit()
    
    # ── Fixed 401 Bug: Use 7-day expiration ──
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.address}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────
# ROUTE 2: Deploy an app
# ─────────────────────────────────────────────────────────
@app.post("/api/deploy")
async def deploy_app(
    file: UploadFile = File(...),
    project_name: str = Form("my-dapp"),
    is_fork: bool = Form(False),
    background_tasks: BackgroundTasks = None, # Added for async support
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # ── Step 1: Create a unique ID ──
    app_id = str(uuid.uuid4()).split('-')[0]
    app_dir = os.path.join(BASE_DEPLOYMENTS_DIR, f"app-{app_id}")
    os.makedirs(app_dir, exist_ok=True)

    # ── Step 2: Validate ZIP ──
    if not (file.filename or "").endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    # ── Step 3: Save ZIP ──
    zip_path = os.path.join(app_dir, "upload.zip")
    with open(zip_path, "wb") as f:
        contents = await file.read()
        f.write(contents)

    # ── Step 4: Extract ZIP (Securely) ──
    try:
        def is_within_directory(directory, target):
            abs_directory = os.path.abspath(directory)
            abs_target = os.path.abspath(target)
            prefix = os.path.commonprefix([abs_directory, abs_target])
            return prefix == abs_directory

        def safe_extract(tar, path=".", members=None, *, numeric_owner=False):
            for member in tar.getmembers():
                member_path = os.path.join(path, member.name)
                if not is_within_directory(path, member_path):
                    raise Exception("Attempted Path Traversal in ZIP")
            tar.extractall(path, members, numeric_owner=numeric_owner)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            # zip_ref.extractall doesn't have the same members check as tarfile easily
            # but we can do it manually for each file
            for member in zip_ref.namelist():
                member_path = os.path.join(app_dir, member)
                if not is_within_directory(app_dir, member_path):
                    raise Exception("Attempted Path Traversal in ZIP")
            zip_ref.extractall(app_dir)
        os.remove(zip_path)

        items = os.listdir(app_dir)
        if len(items) == 1 and os.path.isdir(os.path.join(app_dir, items[0])):
            nested_dir = os.path.join(app_dir, items[0])
            for item in os.listdir(nested_dir):
                shutil.move(os.path.join(nested_dir, item), app_dir)
            os.rmdir(nested_dir)
        
        # ── Step 4.1: Force-Cleanup node_modules ──
        # This prevents 400MB+ Docker context transfers which kill performance.
        node_modules_path = os.path.join(app_dir, "node_modules")
        if os.path.exists(node_modules_path):
            print(f"DEBUG: Removing pre-zipped node_modules from {app_dir} to speed up build...", flush=True)
            shutil.rmtree(node_modules_path, ignore_errors=True)

    except Exception as e:
        shutil.rmtree(app_dir, ignore_errors=True)
        err_msg = str(e)
        if "node_modules" in err_msg and os.name == "nt":
            raise HTTPException(status_code=400, detail="Extraction failed. Delete node_modules before zipping!")
        raise HTTPException(status_code=500, detail=f"Extraction error: {err_msg}")

    # ── Step 5: Detect Type ──
    deploy_type = detect_project_type(app_dir)

    print("DEBUG: Step 6: Creating DB Record and starting background task...", flush=True)
    
    # ── Step 6: Create DB Record ──
    image_name = f"chaindeploy-app-{app_id}"
    deployment = models.Deployment(
        project_name=project_name,
        deploy_type=deploy_type.value,
        status="BUILDING",
        image_name=image_name,
        owner_id=current_user.id
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # ── Step 6.1: Start Background Deployment ──
    background_tasks.add_task(
        run_deployment_task,
        deployment.id,
        app_id,
        app_dir,
        project_name,
        deploy_type,
        image_name,
        is_fork
    )

    return {
        "id": deployment.id,
        "project_name": deployment.project_name,
        "deploy_type": deployment.deploy_type,
        "status": "BUILDING",
        "url": "", # Placeholder until it's running
        "created_at": str(datetime.utcnow())
    }


# ─────────────────────────────────────────────────────────
# Internal: The Async Deployment Worker
# ─────────────────────────────────────────────────────────
def run_deployment_task(deployment_id: int, app_id: str, app_dir: str, project_name: str, deploy_type: models.DeploymentType, image_name: str, is_fork: bool):
    """
    Runs Docker Build and Run in the background.
    Redirects logs to backend/logs/build_{id}.log for live streaming.
    """
    db = database.SessionLocal()
    deployment = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
    if not deployment:
        db.close()
        return

    log_path = os.path.join("logs", f"build_{deployment_id}.log")
    os.makedirs("logs", exist_ok=True)
    
    try:
        with open(log_path, "w", encoding="utf-8") as log_file:
            # ── Step 0: Async Compilation ──
            SC_TYPES = [models.DeploymentType.HARDHAT, models.DeploymentType.FOUNDRY]
            if deploy_type in SC_TYPES:
                log_file.write(f"📦 Found {deploy_type} project. Starting compilation...\n")
                log_file.flush()
                
                success, error_msg = compile_project(app_dir, deploy_type, log_file=log_file)
                if not success:
                    deployment.status = models.DeploymentStatus.FAILED.value
                    deployment.error = error_msg
                    db.commit()
                    log_file.write(f"❌ Compilation Failed: {error_msg}\n")
                    db.close()
                    return
                
                # ── Step 0.1: Extract ABI ──
                log_file.write("📦 Extracting contract ABI...\n")
                abi_json = extract_abi(app_dir, deploy_type)
                if abi_json:
                    deployment.abi = abi_json
                    db.commit()
                    log_file.write("✅ ABI extracted successfully.\n")
                else:
                    log_file.write("⚠️ No ABI found in build artifacts.\n")
                log_file.flush()

            # ── Step A: Direct Mainnet Deployment ──
            SC_TYPES = [models.DeploymentType.HARDHAT, models.DeploymentType.FOUNDRY]
            if deploy_type in SC_TYPES and not is_fork:
                log_file.write(f"🚀 Starting Direct Mainnet Deployment for {deploy_type}...\n")
                log_file.flush()
                
                success, result_val = deploy_to_qie(app_dir, project_name, deploy_type, log_file=log_file)
                if success:
                    deployment.status = models.DeploymentStatus.RUNNING.value
                    deployment.contract_address = result_val
                    deployment.url = f"https://mainnet.qiescan.io/address/{result_val}"
                    db.commit()
                    log_file.write(f"✅ Mainnet Success! Contract: {result_val}\n")
                else:
                    deployment.status = models.DeploymentStatus.FAILED.value
                    deployment.error = result_val
                    db.commit()
                    log_file.write(f"❌ Mainnet Failed: {result_val}\n")
                
                db.close()
                return

            # ── Step B: Docker Build ──
            log_file.write(f"🏗️ Generating Dockerfile (is_fork={is_fork})...\n")
            log_file.flush()
            dockerfile_content, container_port = generate_dockerfile(deploy_type, app_dir, is_fork)
            with open(os.path.join(app_dir, "Dockerfile"), "w", encoding="utf-8") as f:
                f.write(dockerfile_content)

            log_file.write(f"🏗️ Running Docker Build for {image_name}...\n")
            log_file.flush()
            
            build_proc = subprocess.Popen(
                ["docker", "build", "-t", image_name, "."],
                cwd=app_dir,
                stdout=log_file,
                stderr=log_file,
                text=True,
                shell=True
            )
            build_proc.wait()

            if build_proc.returncode != 0:
                deployment.status = models.DeploymentStatus.FAILED.value
                deployment.error = "Docker build failed. Check logs."
                db.commit()
                log_file.write(f"❌ Build Failed with code {build_proc.returncode}\n")
                db.close()
                return

            # ── Step C: Docker Run ──
            log_file.write(f"📡 Finding free port and running container...\n")
            log_file.flush()
            host_port = find_free_port()
            
            extra_ports = []
            rpc_host_port = None
            if is_fork:
                rpc_host_port = find_free_port(start=host_port + 1)
                extra_ports = ["-p", f"{rpc_host_port}:8545"]

            run_proc = subprocess.Popen(
                [
                    "docker", "run", "-d",
                    "-p", f"{host_port}:{container_port}",
                    *extra_ports,
                    "--name", f"chaindeploy-{app_id}",
                    *(["--env-file", os.path.join(app_dir, ".env")]
                      if os.path.exists(os.path.join(app_dir, ".env")) else []),
                    image_name
                ],
                stdout=subprocess.PIPE,
                stderr=log_file,
                text=True,
                shell=True
            )
            stdout, _ = run_proc.communicate()

            if run_proc.returncode != 0:
                deployment.status = models.DeploymentStatus.FAILED.value
                deployment.error = "Docker run failed."
                db.commit()
                log_file.write(f"❌ Run Failed with code {run_proc.returncode}\n")
                db.close()
                return

            # ── Step D: Success ──
            container_id = stdout.strip()
            url = f"http://localhost:{host_port}"
            deployment.status = models.DeploymentStatus.RUNNING.value
            deployment.port = host_port
            deployment.rpc_port = rpc_host_port
            deployment.container_id = container_id
            deployment.url = url
            db.commit()
            
            log_file.write(f"✅ Container Link: {url}\n")
            log_file.write(f"✅ Container ID: {container_id[:12]}\n")
            log_file.flush()

    except Exception as e:
        deployment.status = models.DeploymentStatus.FAILED.value
        deployment.error = str(e)
        db.commit()
        print(f"ERROR in background task: {e}")
    finally:
        shutil.rmtree(app_dir, ignore_errors=True)
        db.close()


# ─────────────────────────────────────────────────────────
# ROUTE 3: List all deployments
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments")
def list_deployments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployments = (
        db.query(models.Deployment)
        .filter(models.Deployment.owner_id == current_user.id)
        .order_by(models.Deployment.created_at.desc())
        .all()
    )
    return deployments

# ─────────────────────────────────────────────────────────
# ROUTE 4: Delete deployment
# ─────────────────────────────────────────────────────────
@app.delete("/api/deployments/{deployment_id}")
def delete_deployment(
    deployment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id
    ).first()

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.container_id:
        subprocess.run(["docker", "stop", deployment.container_id], capture_output=True)
        subprocess.run(["docker", "rm", deployment.container_id], capture_output=True)

    db.delete(deployment)
    db.commit()
    return {"message": "Deleted successfully"}

# ─────────────────────────────────────────────────────────
# ROUTE 5: Get Status
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments/{deployment_id}/status")
def get_deployment_status(
    deployment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id
    ).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    if not deployment.container_id:
        return {"status": deployment.status}

    try:
        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Status}}", deployment.container_id],
            capture_output=True,
            text=True,
            timeout=2
        )
        docker_status = result.stdout.strip() if result.returncode == 0 else "unknown"
        if docker_status == "running" and deployment.status != models.DeploymentStatus.RUNNING.value:
            deployment.status = models.DeploymentStatus.RUNNING.value
            db.commit()
        return {"status": docker_status, "db_status": deployment.status}
    except Exception:
        return {"status": deployment.status}

# ─────────────────────────────────────────────────────────
# ROUTE 6: Stream Logs
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments/{deployment_id}/stream-logs")
def stream_logs(
    deployment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id
    ).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    def unified_log_generator():
        """
        One generator to rule them all: 
        1. Reads build logs from file until container is ready.
        2. Seamlessly switches to docker logs --follow.
        """
        log_path = os.path.join("logs", f"build_{deployment_id}.log")
        sent_build_logs = False
        
        # ── Phase 1: Build Logs ──
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8") as f:
                # Catch up on what's already there
                for line in f:
                    yield f"data: {line}\n\n"
                
                # Keep polling the build file until the container is ready
                import time
                while True:
                    line = f.readline()
                    if line:
                        yield f"data: {line}\n\n"
                    else:
                        db.refresh(deployment)
                        if deployment.container_id or deployment.status in ["RUNNING", "FAILED"]:
                            break
                        time.sleep(0.5)
            sent_build_logs = True

        # ── Phase 2: Switch to Docker Logs ──
        db.refresh(deployment)
        if deployment.container_id:
            if sent_build_logs:
                yield "data: 🚀 Deployment Live! Switching to app logs...\n\n"
            
            # Use encoding='utf-8' and errors='replace' for robustness on Windows
            process = subprocess.Popen(
                ["docker", "logs", "--follow", "--tail", "0", deployment.container_id],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                shell=True
            )
            try:
                for line in iter(process.stdout.readline, ""):
                    yield f"data: {line}\n\n"
            finally:
                process.terminate()
                process.wait()
        elif deployment.status == "FAILED":
             yield f"data: ❌ Build Failed: {deployment.error}\n\n"
        else:
             yield "data: ⌛ Waiting for build to start...\n\n"

    return StreamingResponse(unified_log_generator(), media_type="text/event-stream")

# ─────────────────────────────────────────────────────────
# ROUTE 7: Classic Logs
# ─────────────────────────────────────────────────────────
@app.get("/api/deployments/{deployment_id}/logs")
def get_logs(
    deployment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == deployment_id,
        models.Deployment.owner_id == current_user.id
    ).first()

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.status == models.DeploymentStatus.FAILED.value:
        return {"logs": f"Build Failed:\n\n{deployment.error or 'Error'}"}

    if not deployment.container_id:
        return {"logs": "Not available."}

    result = subprocess.run(
        ["docker", "logs", "--tail", "100", deployment.container_id],
        capture_output=True,
        text=True
    )
    return {"logs": result.stdout + result.stderr}