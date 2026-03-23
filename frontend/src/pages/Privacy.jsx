import GenericPage from './GenericPage'

export default function Privacy() {
  return (
    <GenericPage title="Privacy Policy">
      <p>Your privacy is important to us. This policy outlines how we handle your data.</p>
      <h3>Information Collection</h3>
      <p>We only collect the information necessary to provide you with secure deployment services, primarily the source code you choose to upload and standard web analytics telemetry.</p>
      <h3>Data Security</h3>
      <p>All projects uploaded to ChainDeploy are encrypted at rest and in transit. Your intellectual property belongs strictly to you. Environments run in hardened, sandboxed execution boundaries.</p>
    </GenericPage>
  )
}
