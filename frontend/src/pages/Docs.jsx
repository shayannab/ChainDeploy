import GenericPage from './GenericPage'

export default function Docs() {
  return (
    <GenericPage title="Documentation">
      <p>Welcome to ChainDeploy Documentation. The ultimate platform to build, simulate, and deploy smart contracts and web apps in seconds.</p>
      
      <h2>Core Features</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '24px' }}>
        <div>
          <h3>🚀 Simulation Mode (Anvil)</h3>
          <p>Deploy to a local Anvil fork of QIE Mainnet. Real state, real speed, zero gas costs. Perfect for testing complex migrations before they hit the real world.</p>
        </div>
        <div>
          <h3>⚡ Instant ABI Interaction</h3>
          <p>Our engine parses your contract artifacts automatically. Interact with your functions via a beautiful, typed UI immediately après deployment.</p>
        </div>
      </div>

      <h2>Getting Started</h2>
      <p>ChainDeploy supports a wide range of frameworks out of the box:</p>
      <ul>
        <li><strong>Hardhat & Foundry:</strong> Full smart contract lifecycle support.</li>
        <li><strong>Frontend Frameworks:</strong> React, Vue, Next.js (Static).</li>
        <li><strong>Backend:</strong> Node.js, Python, Go, Rust.</li>
      </ul>
    </GenericPage>
  )
}
