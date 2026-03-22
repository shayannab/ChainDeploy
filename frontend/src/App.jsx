// ─────────────────────────────────────────────────────────
// App.jsx — Main React component
//
// React components are just functions that return HTML-like
// syntax called JSX. When data (state) changes, React
// automatically re-renders the parts of the UI that changed.
//
// useState  = stores a piece of data that can change
// useEffect = runs code when the component loads or data changes
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

// ── Type badge config ─────────────────────────────────────
// Maps deploy_type string → { label, class, icon }
const TYPE_CONFIG = {
  'Hardhat':    { label: 'Hardhat',     cls: 'hardhat',   icon: '⛏️'  },
  'Foundry':    { label: 'Foundry',     cls: 'foundry',   icon: '🔧'  },
  'Truffle':    { label: 'Truffle',     cls: 'truffle',   icon: '🍫'  },
  'Web3 React': { label: 'Web3 React',  cls: 'web3react', icon: '⚛️'  },
  'Node.js':    { label: 'Node.js',     cls: 'static',    icon: '🟩'  },
  'Python':     { label: 'Python',      cls: 'python',    icon: '🐍'  },
  'Static HTML':{ label: 'Static HTML', cls: 'static',    icon: '🌐'  },
}

// ── Helper: get status CSS class ─────────────────────────
const statusClass = (s) => {
  if (s === 'RUNNING')  return 'running'
  if (s === 'BUILDING') return 'building'
  return 'failed'
}

// ── CopyButton — reusable clipboard button ────────────────
function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      className={`btn-copy ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title={label}
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// DeploymentCard — renders one deployed app
// ─────────────────────────────────────────────────────────
function DeploymentCard({ deployment, onDelete }) {
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs]         = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  const typeInfo = TYPE_CONFIG[deployment.deploy_type] || { label: deployment.deploy_type, cls: 'static', icon: '📦' }

  const fetchLogs = async () => {
    if (showLogs) { setShowLogs(false); return; }
    setLoadingLogs(true)
    try {
      const res = await axios.get(`/api/deployments/${deployment.id}/logs`)
      setLogs(res.data.logs || 'No logs available.')
    } catch {
      setLogs('Could not fetch logs.')
    } finally {
      setLoadingLogs(false)
      setShowLogs(true)
    }
  }

  return (
    <div className="deployment-card">
      <div className="card-header">
        <div>
          <div className="card-title">{deployment.project_name}</div>
          <div className="card-type">
            <span className={`type-badge ${typeInfo.cls}`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
        </div>
        <span className={`status-dot ${statusClass(deployment.status)}`}>
          {deployment.status}
        </span>
      </div>

      {/* URL row */}
      {deployment.url && (
        <div className="card-url">
          <span className="url-text">{deployment.url}</span>
          <CopyButton text={deployment.url} />
          <a
            href={deployment.url}
            target="_blank"
            rel="noreferrer"
            className="btn-open"
            title="Open in new tab"
          >
            ↗
          </a>
        </div>
      )}

      {/* Error box if failed */}
      {deployment.status === 'FAILED' && deployment.error && (
        <div className="error-box">
          {deployment.error.slice(0, 220)}
        </div>
      )}

      <div className="card-actions">
        <button className="btn-sm btn-logs" onClick={fetchLogs} disabled={loadingLogs}>
          {loadingLogs ? '...' : showLogs ? 'Hide Logs' : 'Logs'}
        </button>
        <button className="btn-sm btn-delete" onClick={() => onDelete(deployment.id)}>
          Delete
        </button>
      </div>

      {showLogs && (
        <div className="logs-panel">
          <pre>{logs}</pre>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// App — root component
// ─────────────────────────────────────────────────────────
export default function App() {
  // ── State ───────────────────────────────────────────────
  const [file, setFile]               = useState(null)       // the selected ZIP file
  const [projectName, setProjectName] = useState('')          // name input value
  const [deployments, setDeployments] = useState([])          // list from the API
  const [status, setStatus]           = useState(null)        // { type: 'building'|'success'|'error', msg }
  const [dragOver, setDragOver]       = useState(false)       // drag-over state for the upload zone
  const [loading, setLoading]         = useState(false)       // deploy button loading state

  // ── Fetch existing deployments on mount ─────────────────
  // useEffect with [] = "run once when the page first loads"
  useEffect(() => {
    fetchDeployments()
  }, [])

  const fetchDeployments = async () => {
    try {
      const res = await axios.get('/api/deployments')
      setDeployments(res.data)
    } catch {
      // backend might not be up yet, silently ignore
    }
  }

  // ── Handle file selection ────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  // ── Handle drag & drop ───────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.zip')) setFile(f)
    else setStatus({ type: 'error', msg: 'Please drop a .zip file' })
  }, [])

  // ── Deploy! ──────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!file) {
      setStatus({ type: 'error', msg: 'Please select a ZIP file first' })
      return
    }

    setLoading(true)
    setStatus({ type: 'building', msg: `Building and deploying "${projectName || file.name}"...` })

    // FormData is how we send files over HTTP
    // It's like filling out a form with a file attachment
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_name', projectName || file.name.replace('.zip', ''))

    try {
      const res = await axios.post('/api/deploy', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setStatus({
        type: 'success',
        msg: `🚀 Deployed! Running at ${res.data.url} (${res.data.deploy_type})`
      })

      // Reset form
      setFile(null)
      setProjectName('')

      // Refresh deployments list
      fetchDeployments()

    } catch (err) {
      const detail = err.response?.data?.detail || 'Deployment failed. Check the backend logs.'
      setStatus({ type: 'error', msg: detail })
    } finally {
      setLoading(false)
    }
  }

  // ── Delete deployment ────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/deployments/${id}`)
      setDeployments(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Failed to delete deployment')
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">chain<span>deploy</span></div>
        <span className="nav-badge">BETA · LOCAL</span>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">✦ The Web3 Deployment Platform</div>
        <h1>
          Deploy your <span className="gradient">dApp</span><br />
          in seconds, not hours.
        </h1>
        <p>
          Upload a ZIP. We detect Hardhat, Foundry, Truffle, Web3 React,
          and more — containerize it and give you a live URL.
        </p>
      </section>

      {/* Upload Card */}
      <div className="upload-card">
        {/* Drag & drop zone */}
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            id="file-input"
          />
          <span className="upload-icon">
            {file ? '📦' : '⬆️'}
          </span>
          <h3>{file ? file.name : 'Drop your project ZIP here'}</h3>
          <p>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'or click to browse files'}</p>

          {/* Supported type badges */}
          <div className="supported-types">
            {[
              ['Hardhat', 'hardhat'],
              ['Foundry', 'foundry'],
              ['Truffle', 'truffle'],
              ['Web3 React', 'web3react'],
              ['Static HTML', 'static'],
              ['Python', 'python'],
            ].map(([label, cls]) => (
              <span key={cls} className={`type-badge ${cls}`}>{label}</span>
            ))}
          </div>
        </div>

        {/* Project name input + deploy button */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="project-name">PROJECT NAME (OPTIONAL)</label>
            <input
              id="project-name"
              type="text"
              placeholder="my-awesome-dapp"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <button
            className="btn-deploy"
            onClick={handleDeploy}
            disabled={loading || !file}
          >
            {loading ? 'Deploying...' : '🚀 Deploy'}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {status && (
        <div className={`status-banner ${status.type}`}>
          {status.type === 'building' && <div className="spinner" />}
          {status.type === 'success' && '✅ '}
          {status.type === 'error' && '❌ '}
          {status.msg}
        </div>
      )}

      {/* Deployments Dashboard */}
      <section>
        <div className="section-header">
          <h2>Active Deployments</h2>
          <span className="count-badge">{deployments.length}</span>
        </div>

        {deployments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🛸</div>
            <p>No deployments yet. Upload your first dApp to get started.</p>
          </div>
        ) : (
          <div className="deployments-grid">
            {deployments.map(d => (
              <DeploymentCard key={d.id} deployment={d} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
