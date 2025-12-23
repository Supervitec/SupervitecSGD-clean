import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Preop.css';

export default function PreopPage() {
  const [type, setType] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
        setMessage(' Error de autenticación. Recarga la página.');
      }
    };
    checkAuth();
  }, []);


  useEffect(() => {
  if (!type) return;

  const loadForm = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const res = await api.get(`/preop/form/${type}`);
      
      const formFields = res.data.fields.filter(
        (f) => f.label && f.label.trim() !== ''
      );
      setFields(formFields);

      const defaultValues = {};
      formFields.forEach((field) => {
        defaultValues[field.label] = '';
      });
      setValues(defaultValues);
    } catch (err) {
      console.error('Error cargando formulario:', err);
      setMessage(' Error al cargar el formulario. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  loadForm();
}, [type]);


  const handleChange = (label, value) => {
    setValues((prev) => ({
      ...prev,
      [label]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setMessage(' Debes estar autenticado para enviar el formulario');
      return;
    }

    try {
      setSaving(true);
      setMessage('');

      
      const payload = {
        ...values,
        NOMBRE_CONDUCTOR: user.name || user.email,
        TIPO: type,
        FECHA: new Date().toISOString().split('T')[0],
        HORA_ENVIO: new Date().toLocaleTimeString('es-CO', {
          hour12: false,
        }),
        USUARIO_GOOGLE: user.email,
      };

      await api.post(`/preop/submit/${type}`, payload);
      setMessage(' Preoperacional enviado correctamente');

      
      setTimeout(() => {
        setValues({});
        setType(null);
        setMessage('');
      }, 2000);
    } catch (err) {
      console.error('Error enviando preoperacional:', err);
      const errorMsg =
        err.response?.data?.message || 'Error al enviar el preoperacional';
      setMessage(` ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="preop-loading">
        <div className="spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  return (
    <div className="preop-container">
      <div className="preop-header">
        <h2>Inspección Preoperacional</h2>
        <p> </p>
        <h3>Completa el formulario de revisión preoperacional</h3>
      </div>

      {!type && (
        <div className="vehicle-selector">
          <h3>Selecciona el tipo de vehículo:</h3>
          <div className="vehicle-buttons">
            <button
              onClick={() => setType('moto')}
              className="vehicle-btn moto-btn"
            >
             Moto
            </button>
            <button
              onClick={() => setType('carro')}
              className="vehicle-btn carro-btn"
            >
             Carro
            </button>
          </div>
        </div>
      )}

      {type && loading && (
        <div className="preop-loading">
          <div className="spinner"></div>
          <p>Cargando formulario...</p>
        </div>
      )}

      {type && !loading && fields.length > 0 && (
        <div className="preop-form-container">
          <div className="form-header">
            <h3>
              {type === 'moto' ? 'Moto' : 'Carro'}
            </h3>
            <button
              onClick={() => {
                setType(null);
                setFields([]);
                setValues({});
                setMessage('');
              }}
              className="change-vehicle-btn"
            >
              ← Cambiar vehículo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="preop-form">
            <div className="form-info">
              <p>
                <strong>Conductor:</strong> {user.name || user.email}
              </p>
              <p>
                <strong>Fecha:</strong>{' '}
                {new Date().toLocaleDateString('es-CO')}
              </p>
            </div>

            <div className="form-fields">
              {fields.map((field, index) => (
                <div key={index} className="form-field">
                  <label>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={values[field.label] || ''}
                      onChange={(e) =>
                        handleChange(field.label, e.target.value)
                      }
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={values[field.label] || ''}
                      onChange={(e) =>
                        handleChange(field.label, e.target.value)
                      }
                      placeholder={`Ingrese ${field.label.toLowerCase()}`}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={values[field.label] || ''}
                      onChange={(e) =>
                        handleChange(field.label, e.target.value)
                      }
                      placeholder={`Ingrese ${field.label.toLowerCase()}`}
                      required={field.required !== false}
                    />
                  )}
                </div>
              ))}
            </div>

            {message && (
              <div
                className={`form-message ${
                  message.includes('') ? 'success' : 'error'
                }`}
              >
                {message}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setType(null);
                  setFields([]);
                  setValues({});
                  setMessage('');
                }}
                className="cancel-btn"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={saving}
              >
                {saving ? 'Enviando...' : ' Enviar Preoperacional'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
