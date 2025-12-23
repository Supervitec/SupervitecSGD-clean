import { useState, useEffect } from 'react';
import api from '../../../services/api';
import FormDetail from './FormDetail';
import './FormList.css';

function FormsList({ userMode = false }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(' [UserMode] Cargando formularios...');
      console.log(' [UserMode] API URL:', api.defaults.baseURL);

      const response = await api.get('/forms');

      console.log(' [UserMode] Status:', response.status);
      console.log(' [UserMode] Data:', response.data);
      console.log(' [UserMode] Forms:', response.data.forms);

      setForms(response.data.forms || []);
    } catch (err) {
      console.error(' [UserMode] Error completo:', err);
      console.error(' [UserMode] Response:', err.response);
      console.error(' [UserMode] Status:', err.response?.status);
      console.error(' [UserMode] Data:', err.response?.data);
      setError(
        err.response?.data?.message ||
          'Error al cargar formularios. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormClick = (form) => {
    setSelectedForm(form);
  };

  const handleBackToList = () => {
    setSelectedForm(null);
  };

  if (loading) {
    return (
      <div className="forms-loading">
        <div className="spinner" />
        <p>Cargando formularios...</p>
      </div>
    );
  }

  if (selectedForm) {
    return (
      <FormDetail
        form={selectedForm}
        onBack={handleBackToList}
        userMode={userMode}
      />
    );
  }

  return (
    <div className="forms-list-container">
      {userMode && (
        <div className="user-forms-header">
          <h2>Formularios disponibles</h2>
          <p>Selecciona un formulario para responder</p>
        </div>
      )}

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

      {!error && forms.length === 0 && (
        <div className="forms-empty">
          <div className="forms-empty-icon"></div>
          <p>No hay formularios disponibles</p>
          <small>Contacta al administrador si necesitas acceso a formularios.</small>
        </div>
      )}

      {!error && forms.length > 0 && (
        <div className="forms-list">
          {forms.map((form) => (
            <div
              key={form.formId || form.id}
              className="form-card"
              onClick={() => handleFormClick(form)}
            >
              <div className="form-card-header">
                <div className="form-icon"></div>
                <div className="form-info">
                  <h3 className="form-title">
                    {form.info?.title || form.name || 'Formulario sin título'}
                  </h3>
                  <p className="form-description">
                    {form.info?.description || form.description || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div className="form-meta">
                <div className="meta-item">
                  <span className="meta-label">Respuestas</span>
                  <span className="meta-value meta-pill">
                    {form.responsesCount || 0} registradas
                  </span>
                </div>
              </div>

              <div className="form-card-footer">
                <button className="view-analytics-btn">
                  {userMode ? 'Responder' : 'Ver detalles'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FormsList;
