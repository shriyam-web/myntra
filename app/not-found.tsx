export default function NotFound() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fafafa',
      color: '#000',
      margin: 0,
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '600px', padding: '0 20px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 500,
          marginBottom: '20px'
        }}>404: NOT_FOUND</h1>
        <p style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#666'
        }}>The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
