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

// ── Type badge config ─────────────────────────────────────
const TYPE_CONFIG = {
  'Hardhat':    { label: 'Hardhat',     cls: 'hardhat',   icon: '⛏️'  },
  'Foundry':    { label: 'Foundry',     cls: 'foundry',   icon: '🔧'  },
  'Truffle':    { label: 'Truffle',     cls: 'truffle',   icon: '🍫'  },
  'Web3 React': { label: 'Web3 React',  cls: 'web3react', icon: '⚛️'  },
  'Node.js':    { label: 'Node.js',     cls: 'static',    icon: '🟩'  },
  'Python':     { label: 'Python',      cls: 'python',    icon: '🐍'  },
  'Static HTML':{ label: 'Static HTML', cls: 'static',    icon: '🌐'  },
}

const SCATTERED_TECH = [
  { name: 'Hardhat', icon: 'https://api.iconify.design/logos:hardhat-icon.svg', top: '8%', left: '5%', rot: '-8deg' },
  { name: 'Foundry', icon: 'https://api.iconify.design/logos:foundry-icon.svg', top: '12%', right: '5%', rot: '6deg' },
  { name: 'React', icon: 'https://api.iconify.design/logos:react.svg', bottom: '15%', left: '4%', rot: '5deg' },
  { name: 'Truffle', icon: 'https://api.iconify.design/logos:truffle-icon.svg', bottom: '12%', right: '4%', rot: '-7deg' },
  { name: 'Python', icon: 'https://api.iconify.design/logos:python.svg', top: '48%', left: '2%', rot: '-4deg' },
  { name: 'HTML5', icon: 'https://api.iconify.design/logos:html-5.svg', top: '52%', right: '2%', rot: '10deg' },
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
          <img src={t.icon} alt={t.name} />
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
      <div className="card-v3-utils">
        <button className="util-btn" title="Copy URL" onClick={copyUrl}><IconCopy /></button>
        <button className="util-btn" title="Open Link" onClick={e => { e.stopPropagation(); window.open(deployment.url, '_blank') }}><IconExternal /></button>
        <button className="util-btn" title="Delete Deployment" onClick={e => { e.stopPropagation(); onDeleteRequest(deployment.id) }}><IconDelete /></button>
      </div>

      <div className="card-v3-title">{deployment.project_name}</div>
      
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
              <span className={`type-badge ${typeInfo.cls}`}>{typeInfo.icon} {typeInfo.label}</span>
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
          <div className="nav-actions">
            <button className="btn-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
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
                  <span>✦</span> The Web3 Deployment Platform
                </div>
                <h1>
                  Deploy <span className="highlight-cyan">Faster</span>,<br />
                  Build <span className="highlight-purple">Bigger</span>.
                </h1>
                <p>
                  A premium environment for your dApps. Containerized, 
                  scalable, and live in <span className="highlight-orange" style={{ fontWeight: 600 }}>under 60 seconds</span>.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button className="btn-deploy" onClick={() => document.getElementById('deploy-app').scrollIntoView({ behavior: 'smooth' })}>
                    Get Started →
                  </button>
                </div>
              </div>
            </section>

            <div className="upload-card" id="deploy-app">
              <div className="tech-upload-container">
                <input type="file" accept=".zip" onChange={handleFileChange} id="file-input" style={{ display: 'none' }} />
                <div className="upload-zone-overlay" onClick={() => document.getElementById('file-input').click()} />
                
                <div className="tech-header-row">
                  <div className="tech-header-left">
                    <div className="tech-arrows">»</div>
                    <div className="tech-tab">
                      {file ? 'READY FOR DEPLOY' : 'WAITING FOR SOURCE ..'}
                    </div>
                  </div>
                  <div className="tech-flavor-text">
                    SYSTEM STATUS: OK<br />
                    ENCRYPTION: AES-256-GCM<br />
                    NET: SECURE TUNNEL CLOUD-7
                  </div>
                </div>

                <div className="tech-divider"></div>

                <div className="tech-stats-grid">
                  <div className="tech-stat-item">
                    <div className="tech-stat-label">PROGRESS</div>
                    <div className="tech-progress-track">
                      <div className="tech-progress-fill" style={{ width: file ? '100%' : '0%' }}></div>
                    </div>
                  </div>
                  <div className="tech-stat-item">
                    <div className="tech-stat-label">EST. TIME</div>
                    <div className="tech-stat-value">{file ? '0min 45sec' : '--'}</div>
                  </div>
                  <div className="tech-stat-item">
                    <div className="tech-stat-label">FILES READY:</div>
                    <div className="tech-stat-value">{file ? 'VALIDATED' : '0'}</div>
                  </div>
                </div>

                <div className="tech-bottom-line"></div>
                
                {!file && (
                  <p style={{ marginTop: '20px', color: '#888', fontSize: '0.8rem' }}>
                    DRAG AND DROP YOUR .ZIP ARCHIVE HERE OR CLICK TO BROWSE
                  </p>
                )}
                {file && (
                  <p style={{ marginTop: '20px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                    FILE DETECTED: {file.name.toUpperCase()} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
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
              <div className="section-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
                <div className="hero-eyebrow">The Process</div>
                <h2>Simple Flow. Zero Friction.</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                <div className="details-card">
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📂</div>
                  <h3>1. Zip & Drop</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Compress your project folder and drop it into our secure environment.</p>
                </div>
                <div className="details-card">
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔍</div>
                  <h3>2. Auto-Detect</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>We intelligently scan your files to configure the perfect Docker build.</p>
                </div>
                <div className="details-card">
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚡</div>
                  <h3>3. Instant Live</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your app is live with a secure URL, ready for the world to see.</p>
                </div>
              </div>
            </section>

            {/* ── Advanced Features (Tailark Style) ─────────────────── */}
            <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              <div className="section-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
                <div className="hero-eyebrow">Technical Excellence</div>
                <h2>A Platform for Power Users.</h2>
              </div>
              
              <div className="features-grid-tailark">
                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Network</div>
                    <h3>Global Connectivity</h3>
                    <p>Deploy your dApps to 20+ edge regions for sub-100ms latency worldwide.</p>
                  </div>
                  <div className="dotted-map">
                    <div className="map-marker">
                      <span>🇯🇵</span>
                      <span style={{ fontWeight: 600 }}>Tokyo, JP</span>
                      <span style={{ color: 'var(--accent-green)' }}>●</span>
                    </div>
                  </div>
                </div>

                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Support</div>
                    <h3>Real-time Assistance</h3>
                    <p>Developer-first support with instant terminal debugging and AI-aided fixes.</p>
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
                    <h3>Enterprise Performance</h3>
                    <p style={{ margin: '0 auto' }}>Battle-tested architecture with redundant failovers and zero-downtime deployments.</p>
                  </div>
                  <div className="uptime-stat highlight-cyan">99.99%</div>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '4px' }}>UPTIME STATUS : OPERATIONAL</div>
                </div>

                <div className="feature-box">
                  <div>
                    <div className="hero-eyebrow" style={{ fontSize: '10px', padding: '4px 10px', marginBottom: '12px' }}>Insight</div>
                    <h3>Activity Metrics</h3>
                    <p>Monitor deployment frequency, container health, and traffic spikes in real-time.</p>
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
                    <h3>Isolated Runtime</h3>
                    <p>Every deployment is sandboxed with mTLS, automated SSL, and firewall isolation.</p>
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
              <div className="section-header" style={{ textAlign: 'center', margin: '80px 0 40px' }}>
                <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>Dashboard</div>
                <h2>Active Deployments <span style={{ opacity: 0.3, fontSize: '0.6em' }}>({deployments.length})</span></h2>
              </div>
              {deployments.length === 0 ? (
                <div className="empty-state"><div className="icon">🛸</div><p>No deployments yet.</p></div>
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

            <footer style={{ padding: '60px 24px', textAlign: 'center', borderTop: '1px solid var(--border)', marginTop: '80px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <div className="logo" style={{ marginBottom: '16px', opacity: 0.5 }}>chain<span>Deploy</span></div>
              <p>© 2026 ChainDeploy. Built for the Decentralized Web.</p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
