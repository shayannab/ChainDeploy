# ─────────────────────────────────────────────────────────
# models.py — Defines what our database tables look like
#
# Each Python class below = one table in PostgreSQL
# Each class attribute = one column in that table
#
# When we call Base.metadata.create_all(engine),
# SQLAlchemy reads these classes and creates the actual
# SQL tables if they don't exist yet.
# ─────────────────────────────────────────────────────────

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum
from database import Base


# An enum is just a fixed set of allowed values — like a dropdown
class DeploymentStatus(str, enum.Enum):
    PENDING   = "PENDING"    # ZIP received, not yet processed
    BUILDING  = "BUILDING"   # docker build is running
    RUNNING   = "RUNNING"    # container is live and accessible
    FAILED    = "FAILED"     # something went wrong


class DeploymentType(str, enum.Enum):
    HARDHAT    = "Hardhat"        # Ethereum dev framework
    FOUNDRY    = "Foundry"        # Fast Rust-based ETH framework
    TRUFFLE    = "Truffle"        # Classic ETH framework
    WEB3_REACT = "Web3 React"     # React app using ethers/wagmi/viem
    NODE       = "Node.js"        # Generic Node app
    PYTHON     = "Python"         # Python app
    STATIC     = "Static HTML"    # Plain HTML/CSS/JS


class Deployment(Base):
    # This is the name of the PostgreSQL table
    __tablename__ = "deployments"

    # INTEGER PRIMARY KEY — auto-increments: 1, 2, 3, 4...
    id           = Column(Integer, primary_key=True, index=True)

    # The name the user gave their project
    project_name = Column(String, nullable=False)

    # What kind of project it detected (see DeploymentType above)
    deploy_type  = Column(String, default=DeploymentType.NODE)

    # Current status in the pipeline
    status       = Column(String, default=DeploymentStatus.PENDING)

    # The port on the HOST machine the container is listening on
    # e.g. 3001 means http://localhost:3001
    port         = Column(Integer, nullable=True)

    # Docker's internal ID for the running container
    # e.g. "a3f2b1c9d4e5..."  (Docker assigns this when container starts)
    container_id = Column(String, nullable=True)

    # The URL we return to the user
    url          = Column(String, nullable=True)

    # Docker image name, e.g. "chaindeploy-app-5"
    image_name   = Column(String, nullable=True)

    # Error message if something failed
    error        = Column(String, nullable=True)

    # Auto-set when the row is created
    created_at   = Column(DateTime, default=datetime.utcnow)
