import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

// ── Icons (Simplified) ──────────────────────────────────────
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
const IconExternal = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
const IconDelete = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>

// ── ConfirmationModal ───────────────────────────────────────
function ConfirmationModal({ isOpen, onCancel, onConfirm, title, description }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <p className="modal-description">{description}</p>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-btn modal-btn-continue" onClick={onConfirm}>Continue</button>
        </div>
      </div>
    </div>
  )
}

import { Hammer, Wrench, Package, Atom, Code, FileCode, Globe, Sun, Moon, Sparkles, FolderArchive, ScanSearch, Zap, MapPin, Rocket } from 'lucide-react'

// ── Type badge config ─────────────────────────────────────
const TYPE_CONFIG = {
  'Hardhat':    { label: 'Hardhat',     cls: 'hardhat',   icon: <Hammer size={14} />  },
  'Foundry':    { label: 'Foundry',     cls: 'foundry',   icon: <Wrench size={14} />  },
  'Truffle':    { label: 'Truffle',     cls: 'truffle',   icon: <Package size={14} />  },
  'Web3 React': { label: 'Web3 React',  cls: 'web3react', icon: <Atom size={14} />  },
  'Node.js':    { label: 'Node.js',     cls: 'static',    icon: <Code size={14} />  },
  'Python':     { label: 'Python',      cls: 'python',    icon: <FileCode size={14} />  },
  'Static HTML':{ label: 'Static HTML', cls: 'static',    icon: <Globe size={14} />  },
}

const SCATTERED_TECH = [
  { name: 'Python', icon: 'https://api.iconify.design/logos:python.svg', top: '8%', left: '8%', rot: '-8deg' },
  { name: 'Foundry', icon: 'https://avatars.githubusercontent.com/u/98050634?s=200&v=4', top: '15%', right: '10%', rot: '6deg', style: { borderRadius: '16px' } },
  { name: 'React', icon: 'https://api.iconify.design/logos:react.svg', bottom: '15%', left: '10%', rot: '5deg' },
  { name: 'Rust', icon: 'https://api.iconify.design/logos:rust.svg', bottom: '20%', right: '8%', rot: '-7deg', style: { filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))' } },
  { name: 'Node.js', icon: 'https://api.iconify.design/logos:nodejs-icon.svg', top: '48%', left: '5%', rot: '-4deg' },
  { name: 'Go', icon: 'https://api.iconify.design/logos:go.svg', top: '52%', right: '5%', rot: '10deg' },
]

// ── Helper: get status CSS class ─────────────────────────
const statusClass = (s) => {
  if (s === 'RUNNING')  return 'running'
  if (s === 'BUILDING') return 'building'
  return 'failed'
}

function ScatteredTech() {
  return (
    <div className="scattered-tech-area">
      {SCATTERED_TECH.map((t, i) => (
        <div 
          key={i} 
          className="floating-card" 
          style={{ 
            top: t.top, left: t.left, right: t.right, bottom: t.bottom,
            '--rot': t.rot
          }}
        >
          <img src={t.icon} alt={t.name} style={t.style} />
          <span>{t.name}</span>
        </div>
      ))}
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e) => {
    e.preventDefault(); e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

// ── DeploymentCard V3 (Minimalist Glow Square) ──────────────────────
function DeploymentCard({ deployment, onDeleteRequest, onSelect }) {
  const isBuilding = deployment.status !== 'RUNNING'
  
  const copyUrl = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(deployment.url)
    alert('URL copied to clipboard!') // Simple feedback for now
  }

  return (
    <div className="deployment-card-v3" onClick={() => onSelect(deployment)}>
      <div className="card-v3-header">
        <div className="card-v3-title">{deployment.project_name}</div>
        <div className="card-v3-utils">
          <button className="util-btn" title="Copy URL" onClick={copyUrl}><IconCopy /></button>
          <button className="util-btn" title="Open Link" onClick={e => { e.stopPropagation(); window.open(deployment.url, '_blank') }}><IconExternal /></button>
          <button className="util-btn" title="Delete Deployment" onClick={e => { e.stopPropagation(); onDeleteRequest(deployment.id) }}><IconDelete /></button>
        </div>
      </div>

      
      <p className="card-v3-desc">
        Project status: <span className={deployment.status === 'RUNNING' ? 'highlight-cyan' : 'highlight-purple'}>{deployment.status}</span>. 
        {isBuilding ? ' Current builds are being optimized for edge delivery.' : ' Securely hosted on ChainDeploy high-speed edge network.'}
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className={`card-v3-btn ${isBuilding ? 'card-v3-btn-secondary' : ''}`} onClick={e => { e.stopPropagation(); window.open(deployment.url, '_blank') }}>
          {isBuilding ? 'View Pipeline' : 'Launch Site'}
        </button>
      </div>
    </div>
  )
}

// ── ProjectDetails ────────────────────────────────────────
function ProjectDetails({ project, onBack, onDelete }) {
  const [logs, setLogs] = useState('Fetching logs...')
  
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`/api/deployments/${project.id}/logs`)
        setLogs(res.data.logs || 'No logs available.')
      } catch {
        setLogs('Could not fetch logs.')
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [project.id])

  const typeInfo = TYPE_CONFIG[project.deploy_type] || { label: project.deploy_type, cls: 'static', icon: '📦' }

  return (
    <div className="details-view">
      <button className="btn-back" onClick={onBack}>← Back to Deployments</button>
      
      <div className="details-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>{project.project_name}</h1>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <span className={`type-badge ${typeInfo.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{typeInfo.icon} {typeInfo.label}</span>
              <span className={`status-dot ${statusClass(project.status)}`}>{project.status}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-sm btn-delete" onClick={() => { onDelete(project.id); onBack(); }}>Delete Project</button>
          </div>
        </div>
      </div>

      <div className="details-grid">
        <div className="details-main">
          <div className="details-card">
            <h3>Live Logs</h3>
            <div className="terminal">
              {(logs || '').split('\n').map((line, i) => {
                let cls = 'log-line';
                if (line.includes('[INFO]')) cls += ' info';
                if (line.includes('[WARN]')) cls += ' warn';
                if (line.includes('[ERROR]')) cls += ' error';
                return <div key={i} className={cls}>{line}</div>
              })}
            </div>
          </div>
        </div>

        <div className="details-sidebar">
          <div className="details-card" style={{ marginBottom: '24px' }}>
            <h3>Deployment Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span className={`status-dot ${statusClass(project.status)}`} style={{ padding: '2px 8px' }}>{project.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>URL</span>
                <a href={project.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{project.url}</a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Container ID</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{project.container_id?.slice(0, 12)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                <span>{new Date(project.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="details-card">
            <h3>Build Pipeline</h3>
            <div className="pipeline-stepper">
              <div className="step done">ZIP Uploaded</div>
              <div className="step done">Project Detected</div>
              <div className="step done">Dockerfile Generated</div>
              <div className={`step ${project.status === 'RUNNING' ? 'done' : 'active'}`}>Docker Build</div>
              <div className={`step ${project.status === 'RUNNING' ? 'done' : ''}`}>Container Running</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main App Component ────────────────────────────────────
export default function App() {
  const [file, setFile]               = useState(null)
  const [projectName, setProjectName] = useState('')
  const [deployments, setDeployments] = useState([])
  const [status, setStatus]           = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [darkMode, setDarkMode]       = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => { fetchDeployments() }, [])

  const fetchDeployments = async () => {
    try {
      const res = await axios.get('/api/deployments')
      setDeployments(res.data)
    } catch (err) { console.error('Fetch error:', err) }
  }

  const handleDeleteRequest = (id) => {
    setDeleteTargetId(id)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    try {
      await axios.delete(`/api/deployments/${deleteTargetId}`)
      setDeployments(prev => prev.filter(d => d.id !== deleteTargetId))
      if (selectedProject?.id === deleteTargetId) setSelectedProject(null)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setIsModalOpen(false)
      setDeleteTargetId(null)
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.zip')) setFile(f)
    else setStatus({ type: 'error', msg: 'Please drop a .zip file' })
  }, [])

  const handleDeploy = async () => {
    if (!file) return
    setLoading(true)
    setStatus({ type: 'building', msg: `Deploying "${projectName || file.name}"...` })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_name', projectName || file.name.replace('.zip', ''))

    try {
      const res = await axios.post('/api/deploy', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setStatus({ type: 'success', msg: `🚀 Deployed to ${res.data.url}` })
      setFile(null); setProjectName('')
      fetchDeployments()
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.detail || 'Deployment failed.' })
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deployment?')) return
    try {
      await axios.delete(`/api/deployments/${id}`)
      setDeployments(prev => prev.filter(d => d.id !== id))
    } catch { alert('Failed to delete deployment') }
  }

  return (
    <div className={`app-wrapper ${darkMode ? '' : 'light-mode'}`}>
      <div className="app">
        <nav className="navbar">
          <div className="logo">chain<span>Deploy</span></div>
          <div className="nav-links" style={{ display: 'flex', gap: '32px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            <a href="#" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Features</a>
            <a href="#" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Pricing</a>
            <a href="#" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Docs</a>
          </div>
          <div className="nav-actions">
            <button className="btn-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="nav-badge">BETA · V1</span>
          </div>
        </nav>

        {selectedProject ? (
          <ProjectDetails project={selectedProject} onBack={() => setSelectedProject(null)} onDelete={handleDelete} />
        ) : (
          <>
            <section className="hero">
              <ScatteredTech />
              <div className="hero-content">
                <div className="hero-eyebrow">
                  <Sparkles size={14} style={{ color: 'var(--primary)', marginRight: '4px' }} /> The Web3 Deployment Platform
                </div>
                <h1>
                  Ship <span className="highlight-cyan">dApps</span> in minutes,<br />
                  not <span className="highlight-orange">weeks</span>.
                </h1>
                <p>
                  Stop wrestling with infrastructure. chainDeploy turns your code into a production-grade, globally-distributed dApp in one click.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button className="btn-deploy" onClick={() => document.getElementById('deploy-app').scrollIntoView({ behavior: 'smooth' })}>
                    Get Started
                  </button>
                </div>
              </div>
            </section>

            <div 
              className={`upload-card ${dragOver ? 'drag-over' : ''}`} 
              id="deploy-app"
            >
              <div 
                className="upload-dropzone" 
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input type="file" accept=".zip" onChange={handleFileChange} id="file-input" style={{ display: 'none' }} />
                
                <div style={{ textAlign: 'left', width: '100%', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Project Upload</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Supported formats: .ZIP</p>
                </div>

                <div className="upload-box-inner">
                  <div style={{ marginBottom: '16px', background: 'var(--bg-card)', padding: '16px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Click to select
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {file ? `Selected: ${file.name}` : 'or drag and drop file here'}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>PROJECT NAME</label>
                  <input type="text" placeholder="my-awesome-dapp" value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <button className="btn-deploy" onClick={handleDeploy} disabled={loading || !file}>
                  {loading ? 'Deploying...' : '🚀 START DEPLOYMENT'}
                </button>
              </div>
            </div>

            {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}

            {/* ── New Sections ────────────────────────────────── */}
            <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
              <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '60px' }}>
                <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>How it works</div>
                <h2 style={{ margin: 0 }}>(it's stupidly easy)</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                <div className="details-card">
                  <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><FolderArchive size={32} /></div>
                  <h3>1. Zip & Drop</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Compress your project. Drag it in. We take it from there.</p>
                </div>
                <div className="details-card">
                  <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><ScanSearch size={32} /></div>
                  <h3>2. Auto-Detect</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>We scan your codebase and spin up the perfect Docker build automatically. Node, Python, Rust, Go—we know them all.</p>
                </div>
                <div className="details-card">
                  <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><Zap size={32} /></div>
                  <h3>3. Instant Live</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your dApp is live on 20+ edge regions. mTLS, SSL, DDoS protection included. Your users see sub-100ms latency.</p>
                </div>
              </div>
            </section>

            {/* ── Advanced Features (Tailark Style) ─────────────────── */}
            <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '60px' }}>
                <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>Technical Excellence</div>
                <h2 style={{ margin: 0 }}>A Platform for Power Users.</h2>
              </div>
              
              <div className="features-grid-tailark">
                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Network</div>
                    <h3>Global Deployment</h3>
                    <p>Your dApp's live in Tokyo, Singapore, São Paulo before your coffee gets cold. Sub-100ms latency everywhere.</p>
                  </div>
                  <div className="dotted-map">
                    <div className="map-marker">
                      <MapPin size={16} />
                      <span style={{ fontWeight: 600 }}>Tokyo, JP</span>
                      <span style={{ color: 'var(--accent-green)' }}>●</span>
                    </div>
                  </div>
                </div>

                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Support</div>
                    <h3>Real-time Debugging</h3>
                    <p>Build fails at 2am? We show you exactly what broke. AI suggests the fix. One click to retry. Ship without waiting.</p>
                  </div>
                  <div className="chat-mock">
                    <div className="chat-bubble ai">Build failed: missing `process.env`.</div>
                    <div className="chat-bubble user">Fix it automatically.</div>
                    <div className="chat-bubble ai">Env vars injected. Retrying build...</div>
                  </div>
                </div>

                <div className="feature-box full-width">
                  <div style={{ textAlign: 'center' }}>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Reliability</div>
                    <h3>Zero Downtime</h3>
                    <p style={{ margin: '0 auto' }}>99.99% uptime isn't luck—it's architecture. Redundant failovers, automatic scaling, zero-downtime deploys. Sleep well.</p>
                  </div>
                  <div className="uptime-stat highlight-cyan">99.99%</div>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '4px' }}>UPTIME STATUS : OPERATIONAL</div>
                </div>

                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Insight</div>
                    <h3>Live Metrics</h3>
                    <p>Know what your dApp is doing. Right now. Deployments, container health, traffic spikes—all on one dashboard.</p>
                  </div>
                  <div className="activity-chart">
                    {[40, 70, 45, 90, 65, 80, 55, 95, 60, 85].map((h, i) => (
                      <div key={i} className="chart-bar" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>

                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Security</div>
                    <h3>Security by Default</h3>
                    <p>mTLS. AES-256 encryption. Firewall rules. Every deployment is sandboxed by default. Your code's locked down.</p>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                    <span className="type-badge static">mTLS</span>
                    <span className="type-badge static">Firewall</span>
                    <span className="type-badge static">AES-256</span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '80px 0 40px' }}>
                <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>Dashboard</div>
                <h2 style={{ margin: 0 }}>Active Deployments <span style={{ opacity: 0.3, fontSize: '0.6em' }}>({deployments.length})</span></h2>
              </div>
              {deployments.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                  <div className="icon" style={{ marginBottom: '16px', color: 'var(--text-muted)' }}><Rocket size={48} /></div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No deployments yet.</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                    Create one and watch the magic happen. Deploy any Node, Python, Rust, or Go project in under 60 seconds.
                  </p>
                  <button className="btn-deploy" onClick={() => document.getElementById('deploy-app').scrollIntoView({ behavior: 'smooth' })}>
                    Deploy your first dApp
                  </button>
                </div>
              ) : (
                <div className="deployments-grid">
                  {deployments.map(d => (
                    <DeploymentCard 
                      key={d.id} 
                      deployment={d} 
                      onDeleteRequest={handleDeleteRequest} 
                      onSelect={setSelectedProject} 
                    />
                  ))}
                </div>
              )}
            </section>

            <ConfirmationModal
              isOpen={isModalOpen}
              onCancel={() => setIsModalOpen(false)}
              onConfirm={handleDeleteConfirm}
              title="Are you absolutely sure?"
              description="This action cannot be undone. This will permanently delete your project and remove all associated data from our edge servers."
            />

            <footer className="site-footer">
              <div className="footer-grid">
                <div className="footer-brand">
                  <div className="logo" style={{ marginBottom: '16px' }}>chain<span>Deploy</span></div>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Behavioral Designed Activation<br />
                    Journeys for PLG SaaS to lift<br />
                    Aha! moments by 23%.
                  </p>
                </div>
                <div className="footer-column">
                  <h4>RESOURCES</h4>
                  <a href="#">Freebies & Audits</a>
                  <a href="#">Tools</a>
                  <a href="#">Psychology</a>
                  <a href="#">Blog <span className="status-badge">soon</span></a>
                  <a href="#">Components <span className="status-badge">soon</span></a>
                  <a href="#">Playbooks <span className="status-badge">soon</span></a>
                </div>
                <div className="footer-column">
                  <h4>COMPANY <span className="status-badge">soon</span></h4>
                  <a href="#">Mission</a>
                  <a href="#">SaaS Ecosystem</a>
                  <a href="#">Affiliate Program</a>
                  <a href="#">Referral Program</a>
                  <a href="#">Partners</a>
                  <a href="#">About Us</a>
                </div>
                <div className="footer-column">
                  <h4>COMPARE <span className="status-badge">soon</span></h4>
                  <a href="#">DaaS</a>
                  <a href="#">PLG Boutique</a>
                  <a href="#">ProductLed</a>
                  <a href="#">Vulnabyl</a>
                  <a href="#">GrowthMates</a>
                  <a href="#">DelightPath</a>
                </div>
              </div>
              <div className="footer-bottom">
                <div className="footer-copyright">
                  ©2026 ChainDeploy. All rights reserved.
                </div>
                <div className="footer-links-row">
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms & Co</a>
                  <a href="#">Contact Us</a>
                </div>
                <div className="footer-socials">
                  <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg></a>
                  <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg></a>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
