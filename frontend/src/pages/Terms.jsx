import GenericPage from './GenericPage'

export default function Terms() {
  return (
    <GenericPage title="Terms & Conditions">
      <p>By using ChainDeploy, you agree to securely host your applications according to our fair usage guidelines.</p>
      <h3>Acceptable Use</h3>
      <p>You agree not to deploy malicious software, operate botnets, or conduct unauthorized network scanning through our platform.</p>
      <h3>Service Availability</h3>
      <p>While we guarantee 99.99% edge node uptime, our beta management API is provided \"as is\" without extensive SLA guarantees during the v1 rollout phase.</p>
    </GenericPage>
  )
}
