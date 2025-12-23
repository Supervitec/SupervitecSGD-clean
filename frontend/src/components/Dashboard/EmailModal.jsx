import { useState, useEffect } from 'react';
import api from '../../services/api';
import './EmailModal.css';

export default function EmailModal({ emailId, onClose }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(null);
  const [processingAttachment, setProcessingAttachment] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [showProcessedModal, setShowProcessedModal] = useState(false);

  useEffect(() => {
    setError(null);
    setLoading(true);
    loadEmailDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId]);

  const loadEmailDetails = async () => {
    try {
      const response = await api.get(`/gmail/email/${emailId}/full`);
      setEmail(response.data.email);
      setLoading(false);
    } catch (err) {
      console.error('Error loading email:', err);
      setError('No se pudo cargar el correo');
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      setDownloadingAttachment(attachment.attachmentId);

      const response = await api.get(
        `/gmail/attachment/${emailId}/${attachment.attachmentId}?filename=${encodeURIComponent(
          attachment.filename
        )}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setDownloadingAttachment(null);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      alert('Error al descargar el archivo');
      setDownloadingAttachment(null);
    }
  };

  const handleProcessAttachment = async (attachment) => {
    try {
      setProcessingAttachment(attachment.attachmentId);

      const response = await api.get(
        `/gmail/attachment/${emailId}/${attachment.attachmentId}?filename=${encodeURIComponent(
          attachment.filename
        )}`,
        { responseType: 'blob' }
      );

      const base64 = await blobToBase64(response.data);

      const processResponse = await api.post('/files/process-attachment', {
        base64File: base64,
        filename: attachment.filename,
      });

      setProcessedData({
        filename: attachment.filename,
        data: processResponse.data.data,
      });
      setShowProcessedModal(true);
      setProcessingAttachment(null);
    } catch (err) {
      console.error('Error processing attachment:', err);
      alert('Error al procesar el archivo');
      setProcessingAttachment(null);
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const getAttachmentIcon = (mimeType) => {
    if (!mimeType) return '';
    if (mimeType.includes('pdf')) return '';
    if (mimeType.includes('image')) return '';
    if (mimeType.includes('video')) return '';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '';
    if (mimeType.includes('document') || mimeType.includes('word')) return '';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '';
    return '';
  };

  const isProcessable = (filename) =>
    filename.endsWith('.pdf') || filename.endsWith('.xls') || filename.endsWith('.xlsx');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">
            <div className="spinner" />
            <p>Cargando correo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-error">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={onClose} className="close-btn">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!email) return null;

  return (
  <>
    {/* MODAL FULLSCREEN: Vista de correo completo */}
    <div className="email-fullscreen-modal">
      {/* HEADER FIJO */}
      <header className="email-fullscreen-header">
        <div className="email-header-left">
          <button type="button" onClick={onClose} className="back-btn-email">
            ← Volver
          </button>
          <h2 className="email-subject">{email.subject || '(Sin asunto)'}</h2>
        </div>
        <button type="button" onClick={onClose} className="close-btn-fullscreen">
          ✕
        </button>
      </header>

      {/* CONTENIDO SCROLLABLE */}
      <div className="email-fullscreen-content">
        {/* INFO DEL CORREO */}
        <div className="email-info-section">
          <div className="email-info-row">
            <strong>De:</strong>
            <span>{email.from}</span>
          </div>
          <div className="email-info-row">
            <strong>Para:</strong>
            <span>{email.to}</span>
          </div>
          <div className="email-info-row">
            <strong>Fecha:</strong>
            <span>
              {email.date
                ? new Date(email.date).toLocaleString('es-CO', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })
                : 'No disponible'}
            </span>
          </div>
        </div>

        {/* ARCHIVOS ADJUNTOS */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="attachments-section">
            <h3> Archivos adjuntos ({email.attachments.length})</h3>
            <div className="attachments-grid">
              {email.attachments.map((attachment) => (
                <div key={attachment.attachmentId} className="attachment-card">
                  <div className="attachment-info">
                    <span className="attachment-icon">
                      {getAttachmentIcon(attachment.mimeType)}
                    </span>
                    <div className="attachment-details">
                      <div className="attachment-name" title={attachment.filename}>
                        {attachment.filename}
                      </div>
                      <div className="attachment-size">
                        {formatFileSize(attachment.size)}
                      </div>
                    </div>
                  </div>
                  <div className="attachment-actions">
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(attachment)}
                      disabled={downloadingAttachment === attachment.attachmentId}
                      className="download-attachment-btn"
                      title="Descargar archivo"
                    >
                      {downloadingAttachment === attachment.attachmentId ? (
                        <div className="btn-spinner" />
                      ) : (
                        '⬇'
                      )}
                    </button>

                    {isProcessable(attachment.filename) && (
                      <button
                        type="button"
                        onClick={() => handleProcessAttachment(attachment)}
                        disabled={processingAttachment === attachment.attachmentId}
                        className="process-attachment-btn"
                        title="Extraer contenido"
                      >
                        {processingAttachment === attachment.attachmentId ? (
                          <div className="btn-spinner" />
                        ) : (
                          '⚙'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO DEL MENSAJE */}
        <div className="email-body-section">
          {email.bodyHtml ? (
            <div 
              className="email-body-html"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : email.bodyText ? (
            <div className="email-body-text">
              {email.bodyText}
            </div>
          ) : (
            <div className="email-body-empty">
              <p>Este correo no tiene contenido visible</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* MODAL SECUNDARIO: Datos procesados */}
    {showProcessedModal && processedData && (
      <div className="modal-overlay" onClick={() => setShowProcessedModal(false)}>
        <div className="modal-content processed-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">
              Contenido extraído: {processedData.filename}
            </h2>
            <button
              type="button"
              onClick={() => setShowProcessedModal(false)}
              className="modal-close-btn"
            >
              ✕
            </button>
          </div>
          <div className="processed-content">
            <pre className="processed-data">
              {typeof processedData.data === 'string'
                ? processedData.data
                : JSON.stringify(processedData.data, null, 2)}
            </pre>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={() => setShowProcessedModal(false)}
              className="footer-btn secondary"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);}
