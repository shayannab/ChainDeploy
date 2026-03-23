import GenericPage from './GenericPage'

export default function Docs() {
  return (
    <GenericPage title="Documentation">
      <p>Welcome to ChainDeploy Documentation. Here you will find guides and API references to help you build and scale your web3 applications effortlessly.</p>
      <h2>Getting Started</h2>
      <p>ChainDeploy allows you to deploy Node.js, Python, Rust, Go, Hardhat, and Foundry applications in seconds.</p>
      <ul>
        <li>Drag and drop your project ZIP.</li>
        <li>Automated builds for Node, Python, Rust, and Go.</li>
        <li>Multi-region edge network (coming soon - see roadmap).</li>
      </ul>
    </GenericPage>
  )
}
