# 🚀 ChainDeploy

**The Vercel for Web3.** Deploy dApps, smart contract environments, and full-stack services in seconds.

ChainDeploy is an automated deployment engine built for the modern dApp lifecycle. From Hardhat nodes to Python backends, we turn your code into a production-grade containerized service with a single click.

## ✨ Features

- **Wallet-Native Auth**: Sign-In with Ethereum (SIWE) for secure, per-user project isolation.
- **Auto-Stack Detection**: We recognize Hardhat, Foundry, Node.js, Python, Rust, and Go projects automatically.
- **Containerized Excellence**: Fully isolated Docker-based execution.
- **Web3 First**: Native support for smart contract devnodes (Anvil, Hardhat Node).
- **Live Logs**: Real-time terminal streaming for instant debugging.

## 🛠️ User Workflow

1.  **Connect**: Connect your Ethereum wallet (MetaMask, Coinbase, etc.).
2.  **Sign**: Sign a cryptographic message to prove ownership of your workspace.
3.  **Upload**: Drag and drop a `.zip` of your project.
4.  **Ship**: Click "Start Deployment". ChainDeploy detects your stack, builds your image, and provides a live URL.

## 🚀 Supported Stacks

| Type | Framework | Detection |
| :--- | :--- | :--- |
| **Buidl** | Hardhat, Foundry, Truffle | `hardhat.config.js`, `foundry.toml`, etc. |
| **Frontend** | React, Next.js, Vite | `package.json` |
| **Backend** | Node.js, Python | `package.json`, `requirements.txt` |
| **Systems** | Rust, Go | `Cargo.toml`, `go.mod` |

## 🏗️ Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🗺️ Roadmap
- [ ] Global Edge Network (20+ regions)
- [ ] Unified CLI Tool (`chaindeploy deploy`)
- [ ] Automated SSL & mTLS
- [ ] Zero-Downtime Rolling Updates

---
Built with ❤️ for the Web3 hackathon community.
