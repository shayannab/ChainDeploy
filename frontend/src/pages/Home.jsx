import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Hammer, Wrench, Package, Atom, Code, FileCode, Globe, Sparkles, FolderArchive, ScanSearch, Zap, MapPin, Rocket, ShieldCheck, Lock } from 'lucide-react'
import { useAccount, useSignMessage } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

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

function DeploymentCard({ deployment, onDeleteRequest, onSelect }) {
  const [liveStatus, setLiveStatus] = useState(deployment.status)
  const isBuilding = liveStatus === 'BUILDING'
  
  // ── Poll for status ─────────────────────────────────────────
  useEffect(() => {
    if (liveStatus === 'BUILDING') {
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/deployments/${deployment.id}/status`)
          setLiveStatus(res.data.status.toUpperCase())
        } catch (err) { console.error('Card status fail:', err) }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [deployment.id, liveStatus])

  const copyUrl = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(deployment.url)
    alert('URL copied to clipboard!') 
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
        Project status: <span className={liveStatus === 'RUNNING' ? 'highlight-cyan' : 'highlight-purple'}>{liveStatus}</span>. 
        {isBuilding ? ' Current builds are being optimized for edge delivery.' : ' Securely hosted on ChainDeploy high-speed edge network.'}
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button className={`card-v3-btn ${isBuilding ? 'card-v3-btn-secondary' : ''}`} onClick={e => { 
          e.stopPropagation(); 
          if (isBuilding) onSelect(deployment);
          else window.open(deployment.url, '_blank');
        }}>
          {isBuilding ? 'View Pipeline' : 'Launch Site'}
        </button>
        <span className={`status-dot ${statusClass(liveStatus)}`} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>{liveStatus}</span>
      </div>
    </div>
  )
}

function ProjectDetails({ project, onBack, onDelete }) {
  const [logs, setLogs] = useState([])
  const [liveStatus, setLiveStatus] = useState(project.status)
  
  // ── Live Logs (SSE) ──────────────────────────────────────
  useEffect(() => {
    const eventSource = new EventSource(`/api/deployments/${project.id}/stream-logs`)
    
    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev.slice(-100), event.data]) // Keep last 100 lines
    }
    
    eventSource.onerror = (err) => {
      console.error('SSE Error:', err)
      eventSource.close()
    }
    
    return () => eventSource.close()
  }, [project.id])

  // ── Live Status Polling ──────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get(`/api/deployments/${project.id}/status`)
        setLiveStatus(res.data.status.toUpperCase())
      } catch (err) {
        console.error('Status check fail:', err)
      }
    }
    const interval = setInterval(checkStatus, 3000) // Every 3s
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
            <button className="btn-sm btn-delete" onClick={() => onDelete(project.id)}>Delete Project</button>
          </div>
        </div>
      </div>

      <div className="details-grid">
        <div className="details-main">
          <div className="details-card">
            <h3>Live Logs</h3>
            <div className="terminal">
              {logs.length === 0 && <div className="log-line info">Connecting to log stream...</div>}
              {logs.map((line, i) => {
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

export default function Home() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync }    = useSignMessage()

  const [file, setFile]               = useState(null)
  const [projectName, setProjectName] = useState('')
  const [deployments, setDeployments] = useState([])
  const [status, setStatus]           = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [token, setToken]             = useState(localStorage.getItem('cd_token'))
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError]             = useState(false)

  const clearAuth = () => {
    localStorage.removeItem('cd_token')
    setToken(null)
    setDeployments([])
  }

  // ── Auth Logic ──────────────────────────────────────────
  const handleAuth = async () => {
    if (!isConnected || !address || token) return
    
    setIsAuthenticating(true)
    try {
      // 1. Get nonce
      const { data: { nonce } } = await axios.post(`/api/auth/nonce?address=${address}`)
      
      // 2. Sign message
      const message = `Sign this message to authenticate with ChainDeploy: ${nonce}`
      const signature = await signMessageAsync({ message })
      
      // 3. Verify on backend
      const formData = new FormData()
      formData.append('address', address)
      formData.append('signature', signature)
      
      const { data: { access_token } } = await axios.post('/api/auth/verify', formData)
      
      // 4. Save token
      localStorage.setItem('cd_token', access_token)
      setToken(access_token)
    } catch (err) {
      console.error('Auth failed:', err)
      setStatus({ type: 'error', msg: 'Authentication failed. Please try again.' })
    } finally {
      setIsAuthenticating(false)
    }
  }

  useEffect(() => {
    if (isConnected && !token) handleAuth()
  }, [isConnected, address, token])

  // Clear token if wallet disconnects
  useEffect(() => {
    if (!isConnected && token) {
      localStorage.removeItem('cd_token')
      setToken(null)
      setDeployments([])
    }
  }, [isConnected])

  // Setup axios with token
  const api = axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

  useEffect(() => { 
    if (token) fetchDeployments() 
  }, [token])

  const fetchDeployments = async () => {
    try {
      const res = await api.get('/api/deployments')
      setDeployments(res.data)
      setAuthError(false)
    } catch (err) { 
      console.error('Fetch error:', err)
      if (err.response?.status === 401) clearAuth()
    }
  }

  const handleDeleteRequest = (id) => {
    setDeleteTargetId(id)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    try {
      await api.delete(`/api/deployments/${deleteTargetId}`)
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
    setAuthError(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_name', projectName || file.name.replace('.zip', ''))

    try {
      const res = await api.post('/api/deploy', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setStatus({ type: 'success', msg: `🚀 Deployed to ${res.data.url}` })
      setFile(null); setProjectName('')
      fetchDeployments()
    } catch (err) {
      if (err.response?.status === 401) clearAuth()
      setStatus({ type: 'error', msg: err.response?.data?.detail || 'Deployment failed.' })
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    setDeleteTargetId(id)
    setIsModalOpen(true)
  }

  if (selectedProject) {
    return (
      <>
        <ProjectDetails project={selectedProject} onBack={() => setSelectedProject(null)} onDelete={handleDelete} />
        <ConfirmationModal 
          isOpen={isModalOpen} 
          onCancel={() => setIsModalOpen(false)} 
          onConfirm={handleDeleteConfirm}
          title="Delete Deployment?"
          description="This will permanently stop the container and remove the deployment. This action cannot be undone."
        />
      </>
    )
  }

  return (
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
            Stop wrestling with infrastructure. chainDeploy turns your code into a production-grade, deployment-ready dApp in one click.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn-deploy" onClick={() => document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' })}>
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your dApp is live instantly on our high-speed cloud. mTLS, SSL, DDoS protection are on the roadmap.</p>
          </div>
        </div>
      </section>
      
      <section id="roadmap" style={{ padding: '80px 0', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '60px' }}>
          <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>The Future</div>
          <h2 style={{ margin: 0 }}>Our Roadmap</h2>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gap: '24px' }}>
          <div className="roadmap-item" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Global Edge Network</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>UPCOMING</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Deploying to 20+ regions worldwide for sub-100ms latency globally.</p>
          </div>
          <div className="roadmap-item" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Advanced Security Guard</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>PLANNING</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Automated mTLS, DDoS mitigation, and enterprise-grade SSL management.</p>
          </div>
          <div className="roadmap-item" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Unified CLI Tool</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>IN DEV</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Deploy directly from your terminal with a single command.</p>
          </div>
        </div>
      </section>

      <section id="dashboard" style={{ padding: '80px 0', borderTop: '1px solid var(--border)', minHeight: '600px' }}>
        <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '60px' }}>
          <div className="hero-eyebrow" style={{ marginBottom: '16px' }}>Management</div>
          <h2 style={{ margin: 0 }}>Project Dashboard</h2>
        </div>

        {!isConnected ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Lock size={64} style={{ color: 'var(--primary)', marginBottom: '24px' }} />
            <h1>Protected Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please connect your wallet to access your deployments.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
               <ConnectButton />
            </div>
          </div>
        ) : !token ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <ShieldCheck size={64} style={{ color: 'var(--primary)', marginBottom: '24px' }} />
            <h1>Signature Required</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Please sign the message in your wallet to confirm ownership.</p>
            <button className="btn-deploy" onClick={handleAuth} disabled={isAuthenticating}>
              {isAuthenticating ? 'Authenticating...' : 'Sign Message to Enter'}
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div className={`upload-card ${dragOver ? 'drag-over' : ''}`} id="deploy-app" style={{ marginBottom: '60px' }}>
              <div 
                className="upload-dropzone" 
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input type="file" accept=".zip" onChange={handleFileChange} id="file-input" style={{ display: 'none' }} />
                <div style={{ textAlign: 'left', width: '100%', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>New Deployment</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drop your .zip project here</p>
                </div>
                <div className="upload-box-inner">
                   <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {file ? `Selected: ${file.name}` : 'Click or drag and drop file here'}
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
              {status && <div className={`status-banner ${status.type}`} style={{ marginTop: '20px' }}>{status.msg}</div>}
            </div>

            <div className="deployments-grid">
              {deployments.length === 0 ? (
                 <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
                   No deployments found for this address. Change your world today.
                 </div>
              ) : (
                deployments.map(d => (
                  <DeploymentCard 
                    key={d.id} 
                    deployment={d} 
                    onDeleteRequest={handleDeleteRequest} 
                    onSelect={setSelectedProject} 
                  />
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <ConfirmationModal
        isOpen={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete your project data."
      />
    </>
  )
}
