import GenericPage from './GenericPage'

export default function CLI() {
  return (
    <GenericPage title="CLI Reference">
      <p>Deploy directly from your terminal with the ChainDeploy CLI. <span className="status-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--primary)', color: 'var(--primary)', marginLeft: '8px' }}>COMING SOON / BETA</span></p>
      <pre style={{ background: '#111', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border)' }}>
        <code>npm install -g chaindeploy-cli</code>
      </pre>
      <h3>Usage</h3>
      <p>Simply navigate to your project directory and run:</p>
      <pre style={{ background: '#111', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border)' }}>
        <code>chaindeploy deploy</code>
      </pre>
      <p>Your codebase will be analyzed, securely bundled, and pushed to our edge network.</p>
    </GenericPage>
  )
}
