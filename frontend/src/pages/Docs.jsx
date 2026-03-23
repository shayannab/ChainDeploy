import GenericPage from './GenericPage'

export default function Docs() {
  return (
    <GenericPage title="Documentation">
      <p>Welcome to ChainDeploy Documentation. Here you will find guides and API references to help you build and scale your web3 applications effortlessly.</p>
      <h2>Getting Started</h2>
      <p>ChainDeploy allows you to deploy Node.js, Python, Rust, Go, Hardhat, and Foundry applications in seconds.</p>
      <ul>
        <li>Drag and drop your .zip project.</li>
        <li>We handle the Docker build securely.</li>
        <li>Your app goes live on 20+ edge regions globally.</li>
      </ul>
    </GenericPage>
  )
}
