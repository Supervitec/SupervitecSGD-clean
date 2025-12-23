import { useState, useEffect } from 'react';
import api from '../../../services/api';
import FormsAnalytics from './FormsAnalytics';
import './FormsPanel.css';

export default function FormsPanel() {
  const [forms, setForms] = useState([]);
  const [view, setView] = useState('list');
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(' Cargando formularios...');
      const response = await api.get('/forms');

      console.log(' Respuesta del servidor:', response.data);

      if (response.data && response.data.forms) {
        const formsData = response.data.forms;
        console.log(` ${formsData.length} formularios cargados`);
        console.log('Primer formulario:', formsData[0]);
        setForms(formsData);
      } else {
        setForms([]);
        console.warn(' No se encontraron formularios en la respuesta');
      }
    } catch (err) {
      console.error(' Error loading forms:', err);
      console.error('Error details:', err.response?.data);

      if (err.response?.status === 401) {
        setError('No autenticado. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para acceder a Google Forms API. Verifica los scopes de autenticación.');
      } else {
        setError(
          err.response?.data?.message ||
          'Error al cargar formularios. Revisa la consola para más detalles.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalytics = (form) => {
    console.log(' Form seleccionado:', form);
    console.log(' Form ID:', form.id);

    if (!form || !form.id) {
      alert(' Error: El formulario no tiene un ID válido');
      console.error('Form object:', form);
      return;
    }

    setSelectedForm(form);
    setView('analytics');
  };

  const handleBackToList = () => {
    setSelectedForm(null);
    setView('list');
  };

  if (view === 'analytics' && selectedForm) {
    return (
      <FormsAnalytics
        form={selectedForm}
        formId={selectedForm.id}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="forms-panel">
      <div className="forms-header">
        <div>
          <h2>
            <span className="icon"></span>
            Google Forms
          </h2>
          <p> <small>  </small></p>

        </div>
        <p><button
          onClick={loadForms}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? ' Cargando...' : ' Recargar'}
        </button></p>
      </div>

      {/* Tabs por si luego agregas más vistas */}
      <div className="forms-tabs">
        <button
          className={`tab-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          Lista
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span></span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
          <button onClick={loadForms} className="retry-btn">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="forms-loading">
          <div className="spinner" />
          <p>Cargando formularios...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && forms.length === 0 && (
        <div className="forms-empty">
          <div className="forms-empty-icon"></div>
          <p>No hay formularios disponibles</p>
          <small>No se encontraron formularios de Google Forms en la cuenta admin.</small>
          <p> <small>   </small> </p>
         <button onClick={loadForms} className="load-btn">
             Intentar nuevamente
          </button>
        </div>
      )}

      {/* Forms List */}
      {!loading && !error && forms.length > 0 && (
        <div className="forms-list">
          {forms.map((form) => (
            <div key={form.id} className="form-card">
              <div className="form-card-header">
                <div className="form-icon"></div>
                <div className="form-info">
                  <h3 className="form-title">{form.name || 'Sin nombre'}</h3>
                  <p className="form-description">
                    {form.description || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div className="form-meta">
                <div className="meta-item">
                  <span className="meta-label">Última modificación</span>
                  <span className="meta-value meta-pill">
                    {' '}
                    {form.modifiedTime
                      ? new Date(form.modifiedTime).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ID</span>
                  <span className="meta-value form-id-badge">
                    {form.id ? form.id.substring(0, 10) + '…' : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="form-card-actions">
                <a
                  href={form.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="form-btn form-btn-secondary"
                  onClick={(e) => e.stopPropagation()}
                >
                 Abrir   .
                </a>
                <button
                  onClick={() => handleViewAnalytics(form)}
                  className="form-btn form-btn-primary"
                  disabled={!form.id}
                >
                   Analytics
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
