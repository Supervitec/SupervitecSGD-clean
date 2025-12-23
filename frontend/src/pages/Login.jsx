import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css'; 

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authStatus = params.get('auth');
    if (authStatus === 'success') {
      navigate('/dashboard');
    }
  }, [location, navigate]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/google'; 
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      background: '#0f172a', 
      color: 'white' 
    }}>
      <h1 style={{ marginBottom: '2rem' }}>SupervitecSGD</h1>
      <button 
        onClick={handleLogin}
        style={{ 
          padding: '12px 24px', 
          fontSize: '16px', 
          cursor: 'pointer', 
          background: '#fff', 
          color: '#333', 
          border: 'none', 
          borderRadius: '8px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <span style={{ fontSize: '20px' }}>G</span> Iniciar sesión con Google
      </button>
    </div>
  );
}
