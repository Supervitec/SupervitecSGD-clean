import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import './FormDetail.css';

function FormDetail({ form, onBack, userMode = false }) {
  const [formStructure, setFormStructure] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFormStructure = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Cargando estructura del formulario:', form.id);
      const response = await api.get(`/forms/${form.id}`);
      console.log('Estructura cargada:', response.data);
      setFormStructure(response.data.form);
    } catch (error) {
      console.error('Error cargando estructura:', error);
      setError('No se pudo cargar la información del formulario');
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  const loadResponses = useCallback(async () => {
    if (userMode) return; 
    
    try {
      const response = await api.get(`/forms/${form.id}/responses`);
      setResponses(response.data.responses || []);
    } catch (error) {
      console.error('Error cargando respuestas:', error);
    }
  }, [form.id, userMode]);

  useEffect(() => {
    loadFormStructure();
    if (!userMode) {
      loadResponses();
    }
  }, [loadFormStructure, loadResponses, userMode]);

  const handleOpenForm = () => {
    const formUrl = formStructure?.responderUri || 
                    formStructure?.formId ? 
                    `https://docs.google.com/forms/d/${formStructure.formId}/viewform` :
                    form.webViewLink;

    if (formUrl) {
      console.log('Abriendo formulario:', formUrl);
      window.open(formUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.error('No se encontró URL del formulario');
      alert('No se pudo abrir el formulario. Intenta nuevamente.');
    }
  };

  if (loading && !formStructure) {
    return (
      <div className="form-detail">
        <button onClick={onBack} className="back-button">
          Volver
        </button>
        <div className="form-detail-loading">
          <div className="spinner"></div>
          <p>Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-detail">
        <button onClick={onBack} className="back-button">
          Volver
        </button>
        <div className="form-detail-error">
          <span className="error-icon"></span>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadFormStructure} className="retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-detail">
      <button onClick={onBack} className="back-button">
        Volver
      </button>

      <div className="form-header">
        <h2>{form.name || formStructure?.info?.title || 'Formulario'}</h2>
        <p className="form-description">
          {form.description || formStructure?.info?.description || 'Sin descripción'}
        </p>
      </div>

      {userMode && (
        <div className="user-form-actions">
          <button onClick={handleOpenForm} className="respond-button">
          Responder Formulario
          </button>
          <div className="form-info-card">
            <h3>Información</h3>
            <p>Al hacer clic en "Responder Formulario", se abrirá el formulario de Google en una nueva pestaña.</p>
            <p>Completa todas las preguntas y envía el formulario cuando termines.</p>
          </div>
        </div>
      )}

      {!userMode && formStructure && (
        <div className="admin-form-details">
          <div className="form-meta">
            <div className="meta-item">
              <span className="meta-label">Creado:</span>
              <span className="meta-value">
                {new Date(form.createdTime).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Modificado:</span>
              <span className="meta-value">
                {new Date(form.modifiedTime).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Respuestas:</span>
              <span className="meta-value">{responses.length}</span>
            </div>
          </div>

          {formStructure.items && formStructure.items.length > 0 && (
            <div className="form-questions">
              <h3>Preguntas del Formulario</h3>
              <div className="questions-list">
                {formStructure.items.map((item, idx) => (
                  <div key={idx} className="question-item">
                    <div className="question-number">Pregunta {idx + 1}</div>
                    <div className="question-title">
                      {item.title || item.questionItem?.question?.questionId || 'Sin título'}
                    </div>
                    {item.description && (
                      <div className="question-description">{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {responses.length > 0 && (
            <div className="form-responses">
              <h3>Últimas Respuestas</h3>
              <div className="responses-list">
                {responses.slice(0, 5).map((resp, idx) => (
                  <div key={idx} className="response-item">
                    <div className="response-header">
                      <span className="response-number">Respuesta {idx + 1}</span>
                      <span className="response-date">
                        {new Date(resp.createTime).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <div className="response-email">
                      {resp.respondentEmail || 'Anónimo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-actions">
            <button onClick={handleOpenForm} className="view-form-button">
              Ver Formulario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormDetail;
