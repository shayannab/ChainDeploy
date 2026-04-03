import { useState, useEffect, useCallback, useRef } from 'react'
import { Hammer, Wrench, Package, Atom, Code, FileCode, Globe, Sparkles, FolderArchive, ScanSearch, Zap, MapPin, Rocket, ShieldCheck, Lock, Activity, Terminal } from 'lucide-react'
import { useAccount, useSignMessage } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

import ContractInteractor from '../components/ContractInteractor'

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
  { name: 'Hardhat', icon: 'https://api.iconify.design/logos:hardhat-icon.svg', top: '8%', left: '8%', rot: '-8deg' },
  { name: 'Foundry', icon: 'https://avatars.githubusercontent.com/u/98050634?s=200&v=4', top: '15%', right: '10%', rot: '6deg', style: { borderRadius: '16px' } },
  { name: 'Solidity', icon: 'https://api.iconify.design/logos:solidity.svg', bottom: '15%', left: '10%', rot: '5deg' },
  { name: 'Metamask', icon: 'https://api.iconify.design/logos:metamask-icon.svg', top: '48%', left: '5%', rot: '-4deg' },
  { name: 'Ethereum', icon: 'https://api.iconify.design/logos:ethereum.svg', top: '52%', right: '5%', rot: '10deg' },
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

function DeploymentCard(props) {
  const { deployment, onDeleteRequest, onSelect } = props
  const [liveStatus, setLiveStatus] = useState(deployment.status)
  const isBuilding = liveStatus === 'BUILDING'
  
  // ── Poll for status ─────────────────────────────────────────
  useEffect(() => {
    if (liveStatus === 'BUILDING') {
      const interval = setInterval(async () => {
        try {
          const headers = props.token ? { Authorization: `Bearer ${props.token}` } : {}
          const res = await fetch(`/api/deployments/${deployment.id}/status`, { headers })
          if (!res.ok) throw new Error('Status check failed')
          const data = await res.json()
          setLiveStatus(data.status.toUpperCase())
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
          {isBuilding ? 'View Pipeline' : (deployment.url?.includes('qiescan') ? 'View Explorer' : (deployment.deploy_type === 'QIE Fork' ? 'Open Simulator' : 'Launch Site'))}
        </button>
        {deployment.deploy_type === 'QIE Fork' && <span className="type-badge foundry" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>SIMULATED</span>}
        <span className={`status-dot ${statusClass(liveStatus)}`} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>{liveStatus}</span>
      </div>
    </div>
  )
}

function ProjectDetails(props) {
  const { project, onBack, onDelete } = props
  const [logs, setLogs] = useState([])
  const [liveStatus, setLiveStatus] = useState(project.status)
  
  // ── Live Logs (SSE) ──────────────────────────────────────
  useEffect(() => {
    const url = props.token 
      ? `/api/deployments/${project.id}/stream-logs?token=${props.token}`
      : `/api/deployments/${project.id}/stream-logs`;
    
    const eventSource = new EventSource(url)
    
    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev.slice(-100), event.data]) // Keep last 100 lines
    }
    
    eventSource.onerror = (err) => {
      console.error('SSE Error:', err)
      eventSource.close()
    }
    
    return () => eventSource.close()
  }, [project.id, props.token])

  // ── Live Status Polling ──────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const headers = props.token ? { Authorization: `Bearer ${props.token}` } : {}
        const res = await fetch(`/api/deployments/${project.id}/status`, { headers })
        if (!res.ok) throw new Error('Status check failed')
        const data = await res.json()
        setLiveStatus(data.status.toUpperCase())
      } catch (err) {
        console.error('Status check fail:', err)
      }
    }
    const interval = setInterval(checkStatus, 3000) // Every 3s
    return () => clearInterval(interval)
  }, [project.id, props.token])

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

          {(project.abi && project.contract_address) && (
            <div className="details-card" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Activity size={20} className="highlight-cyan" />
                <h3 style={{ margin: 0 }}>Contract Interaction</h3>
              </div>
              <ContractInteractor deployment={project} />
            </div>
          )}
        </div>

        <div className="details-sidebar">
          <div className="details-card" style={{ marginBottom: '24px' }}>
            <h3>Deployment Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span className={`status-dot ${statusClass(project.status)}`} style={{ padding: '2px 8px' }}>{project.status}</span>
              </div>
              {project.contract_address && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Contract</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                      {project.contract_address.slice(0, 10)}...{project.contract_address.slice(-6)}
                    </span>
                    <button className="util-btn-sm" onClick={() => { navigator.clipboard.writeText(project.contract_address); alert('Copied!'); }}><IconCopy /></button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>URL / Explorer</span>
                {project.url ? (
                  <a href={project.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {project.url.includes('qie.digital') ? 'View on QieScan' : project.url}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Generating...</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Container ID</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{project.container_id ? project.container_id.slice(0, 12) : 'N/A'}</span>
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
  const [isFork, setIsFork]           = useState(true) // Default to Simulator for new users
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
  const authInProgress = useRef(false)

  const clearAuth = () => {
    localStorage.removeItem('cd_token')
    setToken(null)
    setDeployments([])
  }

  // ── Auth Logic ──────────────────────────────────────────
  const handleAuth = async () => {
    if (!isConnected || !address || token || authInProgress.current) return
    
    authInProgress.current = true
    setIsAuthenticating(true)
    try {
      // 1. Get nonce
      const resNonce = await fetch(`/api/auth/nonce?address=${address}`, { method: 'POST' })
      if (!resNonce.ok) throw new Error('Failed to get nonce')
      const { nonce } = await resNonce.json()
      
      // 2. Sign message
      const message = `Sign this message to authenticate with ChainDeploy: ${nonce}`
      const signature = await signMessageAsync({ message })
      
      // 3. Verify on backend
      const formData = new FormData()
      formData.append('address', address)
      formData.append('signature', signature)
      
      const resVerify = await fetch('/api/auth/verify', {
        method: 'POST',
        body: formData
      })
      if (!resVerify.ok) throw new Error('Verification failed')
      const { access_token } = await resVerify.json()
      
      // 4. Save token
      localStorage.setItem('cd_token', access_token)
      setToken(access_token)
    } catch (err) {
      console.error('Auth failed:', err)
      setStatus({ type: 'error', msg: 'Authentication failed. Please try again.' })
    } finally {
      setIsAuthenticating(false)
      authInProgress.current = false
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
  
  useEffect(() => { 
    if (token) fetchDeployments() 
  }, [token])

  const fetchDeployments = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/deployments', { headers })
      if (!res.ok) {
        if (res.status === 401) clearAuth()
        throw new Error('Failed to fetch deployments')
      }
      const data = await res.json()
      setDeployments(data)
      setAuthError(false)
    } catch (err) { 
      console.error('Fetch error:', err)
    }
  }

  const handleDeleteRequest = (id) => {
    setDeleteTargetId(id)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`/api/deployments/${deleteTargetId}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) throw new Error('Delete failed')
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
    formData.append('is_fork', isFork ? 'true' : 'false')

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/deploy', { 
        method: 'POST',
        headers, 
        body: formData
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 401) clearAuth()
        throw new Error(errorData.detail || 'Deployment failed.')
      }
      
      const newProject = await res.json()
      setDeployments(prev => [newProject, ...prev])
      setSelectedProject(newProject)
      
      setFile(null); setProjectName('')
      setStatus(null) // Clear the big banner since we're in technical view now
    } catch (err) {
      // With fetch, we handle 401 in the response check above.
      // Generic catch for network or parsing errors.
      setStatus({ type: 'error', msg: err.message || 'Deployment failed.' })
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    setDeleteTargetId(id)
    setIsModalOpen(true)
  }

  if (selectedProject) {
    return (
      <>
        <ProjectDetails 
          project={selectedProject} 
          token={token}
          onBack={() => setSelectedProject(null)} 
          onDelete={handleDelete} 
        />
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
            The All-in-One <span className="highlight-cyan">Smart Contract</span><br />
             Sandbox & <span className="highlight-orange">Deployment</span> Platform
          </h1>
          <p>
            Zero-config deployments for Hardhat, Foundry, and beyond. Simulate locally with a one-click Anvil fork, and interact with your contracts immediately using our auto-parsed ABI UI.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          <div className="details-card">
            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><FolderArchive size={32} /></div>
            <h3>1. Zip & Drop</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Compress your Hardhat or Foundry project and drag it in. Our engine handles the rest.</p>
          </div>
          <div className="details-card">
            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><ScanSearch size={32} /></div>
            <h3>2. Auto-Detect</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>We scan your codebase and spin up the perfect Docker container automatically—no configuration required.</p>
          </div>
          <div className="details-card">
            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><Activity size={32} /></div>
            <h3>3. Simulator Mode</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Test risk-free with an instant Anvil fork of QIE Mainnet. Real state, zero cost, total control.</p>
          </div>
          <div className="details-card">
            <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><Terminal size={32} /></div>
            <h3>4. Instant Interact</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Automatic ABI parsing provides a dynamic UI to call functions immediately after deployment.</p>
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
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Local Simulation Mode</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>LIVE</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Spin up instant Anvil forks for risk-free testing with real mainnet state.</p>
          </div>
          <div className="roadmap-item" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Instant ABI Interaction</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>LIVE</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Automatic ABI parsing generates a dynamic UI to interact with your contracts instantly.</p>
          </div>
          <div className="roadmap-item" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Global Edge Network</h4>
              <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>IN PROGRESS</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Deploying to 20+ regions worldwide for sub-100ms latency globally.</p>
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

              <div className="form-row" style={{ gap: '24px' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>PROJECT NAME</label>
                  <input type="text" placeholder="my-awesome-dapp" value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1.5 }}>
                  <label>DEPLOYMENT MODE</label>
                  <select 
                    value={isFork ? "fork" : "mainnet"} 
                    onChange={e => setIsFork(e.target.value === "fork")}
                    style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' }}
                  >
                    <option value="fork">🚀 Simulator (Free)</option>
                    <option value="mainnet">🌏 QIE Mainnet</option>
                  </select>
                </div>
                <button 
                  className={`btn-deploy ${!isFork ? 'mainnet-deploy-active' : ''}`} 
                  onClick={() => {
                    if (!isFork) {
                      if (window.confirm("You are about to deploy to QIE Mainnet. This will use the platform's gas. Are you sure?")) {
                        handleDeploy();
                      }
                    } else {
                      handleDeploy();
                    }
                  }} 
                  disabled={loading || !file} 
                  style={{ flex: 1, height: '48px', marginTop: '18px' }}
                >
                  {loading ? 'Processing...' : (isFork ? 'DEPLOY PROJECT' : 'SHIP TO MAINNET')}
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
                    token={token}
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
