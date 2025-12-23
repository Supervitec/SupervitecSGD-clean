import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './PublicPreopForm.css';

export default function PublicPreopForm() {
  const { type } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { userId, userName, vehicleType } = location.state || {};
  
  const [formDefinition, setFormDefinition] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId || !userName) {
      alert(' No se encontraron datos del usuario. Vuelve a seleccionar tu nombre.');
      navigate('/preop-public');
      return;
    }

    loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/preop/form/${type}`);
      
      console.log(' Formulario cargado:', response.data);
      
      setFormDefinition(response.data);
      
      const initialData = {
        NOMBRE_CONDUCTOR: userName,
        ID_CONDUCTOR: userId,
        TIPO_VEHICULO: vehicleType
      };
      
      setFormData(initialData);
      
    } catch (error) {
      console.error('Error cargando formulario:', error);
      alert('Error al cargar el formulario de preoperacional');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    console.log(` Cambiando ${fieldName} a:`, value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return;

    const missingFields = [];
    
    if (formDefinition?.fields) {
      formDefinition.fields.forEach(field => {
        const uniqueFieldName = generateFieldName(field);
        if (field.required && !formData[uniqueFieldName]) {
          missingFields.push(field.label);
        }
      });
    }

    if (missingFields.length > 0) {
      alert(` Por favor completa los siguientes campos:\n\n${missingFields.join('\n')}`);
      return;
    }

    try {
      setSubmitting(true);
      
      console.log(' Enviando formulario:', formData);
      
      const response = await api.post(`/preop/submit/${type}`, formData);
      
      console.log(' Respuesta:', response.data);
      
      if (response.data.success) {
        alert(response.data.message || ' Preoperacional registrado correctamente');
        navigate('/preop-public');
      }
      
    } catch (error) {
      console.error('Error enviando formulario:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Error al enviar el preoperacional';
      
      alert(` ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const generateFieldName = (field) => {
    if (field.fieldName && field.fieldName !== 'undefined') {
      return field.fieldName;
    }
    
    return field.label
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^A-Z0-9]/g, '_') 
      .replace(/_+/g, '_') 
      .replace(/^_|_$/g, ''); 
  };

  const renderField = (field, fieldIndex) => {
    const uniqueFieldName = generateFieldName(field);
    const value = formData[uniqueFieldName] || '';

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(uniqueFieldName, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className="form-input"
            id={`field_${fieldIndex}`}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(uniqueFieldName, e.target.value)}
            required={field.required}
            className="form-input"
            id={`field_${fieldIndex}`}
          >
            <option value="">-- Selecciona --</option>
            {field.options?.map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map((opt, optIdx) => {
              const radioId = `radio_${fieldIndex}_${optIdx}`;
              const radioName = `radio_field_${fieldIndex}`;
              
              return (
                <label key={optIdx} className="radio-label" htmlFor={radioId}>
                  <input
                    type="radio"
                    id={radioId}
                    name={radioName}
                    value={opt}
                    checked={value === opt}
                    onChange={(e) => handleInputChange(uniqueFieldName, e.target.value)}
                    required={field.required}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(uniqueFieldName, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className="form-textarea"
            rows={4}
            id={`field_${fieldIndex}`}
          />
        );

      default:
        return <p>Tipo de campo desconocido: {field.type}</p>;
    }
  };

  if (loading) {
    return (
      <div className="preop-form-container">
        <div className="loading">
          <div className="spinner" />
          <p>Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!formDefinition || !formDefinition.fields) {
    return (
      <div className="preop-form-container">
        <div className="error-message">
          <p> No se pudo cargar el formulario</p>
          <button onClick={() => navigate('/preop-public')} className="back-btn">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preop-form-container">
      <div className="form-card">
        <div className="form-header">
          <button 
            onClick={() => navigate('/preop-public')} 
            className="back-button"
          >
            Volver
          </button>
          <h1> Preoperacional {type === 'moto' ? '' : ''}</h1>
          <div className="user-info">
            <p><strong>Conductor:</strong> {userName}</p>
            <p><strong>Tipo:</strong> {vehicleType}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="preop-form">
          <div className="form-section">
            <h2 className="section-title">Información del Preoperacional</h2>
            
            {formDefinition.fields.map((field, idx) => (
              <div key={idx} className="form-field">
                <label className="field-label" htmlFor={`field_${idx}`}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {renderField(field, idx)}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
            >
              {submitting ? 'Enviando...' : ' Enviar Preoperacional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
