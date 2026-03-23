import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'

// Pages
import Home from './pages/Home'
import Docs from './pages/Docs'
import CLI from './pages/CLI'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)
  const location = useLocation()

  return (
    <div className={`app-wrapper ${darkMode ? '' : 'light-mode'}`}>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>chain<span>Deploy</span></Link>
          <div className="nav-links" style={{ display: 'flex', gap: '32px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            {location.pathname === '/' ? (
              <>
                <a href="#features" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Features</a>
                <a href="#dashboard" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Dashboard</a>
              </>
            ) : (
              <>
                <Link to="/" className="nav-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Home</Link>
              </>
            )}
          </div>
          <div className="nav-actions">
            <button className="btn-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="nav-badge">BETA · V1</span>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/cli" element={<CLI />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* Fallback simply redirects home for now */}
          <Route path="*" element={<Home />} />
        </Routes>

        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo" style={{ marginBottom: '16px', textDecoration: 'none' }}>chain<span>Deploy</span></Link>
              <p style={{ color: 'var(--text-muted)' }}>
                The deployment platform built for the modern dApp lifecycle.<br />
                Scale infinitely on our fast global edge network.
              </p>
            </div>
            <div className="footer-column">
              <h4>RESOURCES</h4>
              <Link to="/docs">Documentation</Link>
              <Link to="/cli">CLI Reference</Link>
              <a href="https://github.com/shayannab/ChainDeploy" target="_blank" rel="noreferrer">GitHub Repo</a>
              <a href="#">Community Discord</a>
            </div>
            <div className="footer-column">
              <h4>PLATFORM</h4>
              {location.pathname === '/' ? (
                <>
                  <a href="#dashboard">Dashboard</a>
                  <a href="#features">Edge Regions</a>
                  <a href="#features">Supported Frameworks</a>
                </>
              ) : (
                <>
                  <Link to="/">Dashboard</Link>
                  <Link to="/">Edge Regions</Link>
                  <Link to="/">Supported Frameworks</Link>
                </>
              )}
              <a href="#">System Status <span className="status-badge" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>ok</span></a>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">
              ©2026 ChainDeploy. All rights reserved.
            </div>
            <div className="footer-links-row">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms & Co</Link>
              <a href="#">Contact Us</a>
            </div>
            <div className="footer-socials">
              <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg></a>
              <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg></a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
