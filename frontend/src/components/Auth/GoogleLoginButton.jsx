import { useState, useEffect } from 'react';
import './GoogleLoginButton.css';

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const sessionStatus = params.get('session');

    if (authStatus === 'error') {
      const reason = params.get('reason') || 'desconocido';
      setErrorMessage(`Error de autenticación: ${reason}`);
    }

    if (sessionStatus === 'expired') {
      setErrorMessage('Tu sesión ha expirado, inicia sesión nuevamente');
    }

    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = () => {
    setLoading(true);
    setErrorMessage('');
    
    const apiUrl = import.meta.env.VITE_API_URL || 
                   (window.location.hostname === 'localhost' 
                     ? 'http://localhost:3000' 
                     : window.location.origin);
    
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="google-login-container">
      {/* Background particles */}
      <div className="particles">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Parallax background layers */}
      <div
        className="parallax-layer layer-1"
        style={{
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`
        }}
      />
      <div
        className="parallax-layer layer-2"
        style={{
          transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`
        }}
      />
      <div
        className="parallax-layer layer-3"
        style={{
          transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
        }}
      />

      {/* Main content */}
      <div className="login-card">
        <div className="card-glow" />
        
        <div className="logo-container">
          <div className="logo-circle">
            <span className="logo-icon"></span>
          </div>
          <h1 className="app-title">Supervitec SGD</h1>
          <p className="app-subtitle">Sistema de Gestión de Obras y Proyectos</p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="error-banner">
            <span className="error-icon"></span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Button */}
        <button
          className={`google-btn ${loading ? 'loading' : ''}`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Security badge */}
        <div className="security-badge">
          <span className="badge-icon"></span>
          <span>Conexión segura con Google</span>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Gestión de Proyectos</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Correos de Gmail</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Google Drive</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p>© 2025 Supervitec. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
