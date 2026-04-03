import GenericPage from './GenericPage'

export default function CLI() {
  return (
    <GenericPage title="CLI Reference">
      <p>Deploy directly from your terminal with the ChainDeploy CLI. Manage your deployments from your favorite shell.</p>
      
      <div className="terminal" style={{ margin: '32px 0' }}>
        <div className="log-line info">$ npm install -g chaindeploy-cli</div>
        <div className="log-line info">$ chaindeploy login</div>
        <div className="log-line info">$ chaindeploy deploy --simulator</div>
      </div>

      <h2>Commands List</h2>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div className="details-card">
          <code>chaindeploy deploy</code>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '8px 0 0' }}>Analyzes, bundles, and ships your project to production. Supports <code>--simulator</code> flag for sandbox testing.</p>
        </div>
        <div className="details-card">
          <code>chaindeploy logs &lt;id&gt;</code>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '8px 0 0' }}>Stream real-time build and runtime logs directly to your machine.</p>
        </div>
        <div className="details-card">
          <code>chaindeploy info</code>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '8px 0 0' }}>Get your account usage, active deployments, and endpoint statuses.</p>
        </div>
      </div>
    </GenericPage>
  )
}
