export default function GenericPage({ title, children }) {
  return (
    <div className="generic-page" style={{ padding: '120px 24px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '40px', background: 'var(--text-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h1>
      <div className="prose" style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}
