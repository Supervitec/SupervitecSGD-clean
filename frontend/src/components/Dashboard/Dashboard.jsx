import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './Dashboard.css';
import EmailModal from './EmailModal';
import FormsPanel from './Forms/FormsPanel';
import AdminReviewPage from './AdminReviewPage';
import PreopUsersAdmin from './PreopUsersAdmin';
import UserView from './UserView';
import WorkCalendarPanel from './WorkCalendar/WorkCalendarPanel';
import AdminPreopPanel from './AdminView/AdminPreopPanel';
import CitationsPanel from './AdminView/CitationsPanel';


import dashboardIcon from '../../assets/icons/dashboard.png';
import gmailIcon from '../../assets/icons/gmail.png';
import driveIcon from '../../assets/icons/drive.png';
import formsIcon from '../../assets/icons/forms.png';
import emailIcon from '../../assets/icons/email.png';
import folderIcon from '../../assets/icons/folder.png';
import fileIcon from '../../assets/icons/file.png';
import calendarIcon from '../../assets/icons/calendar.png';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [folderStack, setFolderStack] = useState([
    { id: 'root', name: 'Mi unidad' },
  ]);
  const [currentFolderName, setCurrentFolderName] = useState('Mi unidad');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [stats, setStats] = useState({
    totalEmails: 0,
    totalFiles: 0,
    totalFolders: 0,
    totalForms: 0,
  });

  // ===== Helper admin =====
  const isAdmin = (currentUser) => {
    const admins = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return admins.includes((currentUser?.email || '').toLowerCase());
  };

  const userIsAdmin = isAdmin(user);

  // ===== Drive =====
  const loadDriveFiles = useCallback(
    async (folderId = 'root', pushStack = false, folderName = 'Mi unidad') => {
      try {
        setLoadingFiles(true);
        const response = await api.get(`/drive/folder/${folderId}?limit=100`);
        setDriveFiles(response.data.files);

        const folders = response.data.files.filter(
          (f) => f.mimeType === 'application/vnd.google-apps.folder'
        );
        const files = response.data.files.filter(
          (f) => f.mimeType !== 'application/vnd.google-apps.folder'
        );

        setStats((prev) => ({
          ...prev,
          totalFiles: files.length,
          totalFolders: folders.length,
        }));

        if (pushStack) {
          setFolderStack((fs) => [...fs, { id: folderId, name: folderName }]);
        }
        setCurrentFolderName(folderName);
        setSearchTerm('');
        setFileTypeFilter('all');
      } catch (err) {
        console.error('Error cargando archivos:', err);
        alert(
          'Error al cargar archivos de Drive: ' +
            (err.response?.data?.message || err.message)
        );
      } finally {
        setLoadingFiles(false);
      }
    },
    []
  );

  const filterFiles = useCallback(() => {
    let filtered = driveFiles;
    if (searchTerm) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter((file) => {
        if (fileTypeFilter === 'folder') {
          return file.mimeType === 'application/vnd.google-apps.folder';
        }
        if (fileTypeFilter === 'pdf') return file.mimeType.includes('pdf');
        if (fileTypeFilter === 'excel') {
          return (
            file.mimeType.includes('spreadsheet') ||
            file.mimeType.includes('excel')
          );
        }
        if (fileTypeFilter === 'word') {
          return (
            file.mimeType.includes('document') || file.mimeType.includes('word')
          );
        }
        if (fileTypeFilter === 'image') return file.mimeType.includes('image');
        return true;
      });
    }
    setFilteredFiles(filtered);
  }, [driveFiles, searchTerm, fileTypeFilter]);

  // ===== Emails =====
  const filterEmails = useCallback(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = emails.filter(
        (email) =>
          (email.subject && email.subject.toLowerCase().includes(term)) ||
          (email.from && email.from.toLowerCase().includes(term)) ||
          (email.snippet && email.snippet.toLowerCase().includes(term))
      );
      setFilteredEmails(filtered);
    } else {
      setFilteredEmails(emails);
    }
  }, [emails, searchTerm]);

  const loadEmails = async () => {
    try {
      setLoadingEmails(true);
      const response = await api.get('/gmail/projects?limit=50');

      if (response.data && Array.isArray(response.data.emails)) {
        setEmails(response.data.emails);
        setStats((prev) => ({
          ...prev,
          totalEmails: response.data.emails.length,
        }));
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error('Error fatal al cargar correos:', err);
      if (err.response) {
        console.error('Data del error:', err.response.data);
        console.error('Status del error:', err.response.status);
      }
      alert(
        'Error al cargar correos: ' +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoadingEmails(false);
    }
  };

  // ===== User =====
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        console.log('DEBUG /auth/me response:', response.data);
        setUser(response.data.user);
      } catch (err) {
        console.error('Error cargando usuario:', err);
        setError('No se pudo cargar la información del usuario');
        if (err.response?.status === 401) {
          window.location.href = '/?session=expired';
        }
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  // ===== Efectos de filtros =====
  useEffect(() => {
    if (activeTab === 'drive' && driveFiles.length === 0) {
      loadDriveFiles('root', false, 'Mi unidad');
    }
  }, [activeTab, driveFiles.length, loadDriveFiles]);

  useEffect(() => {
    filterFiles();
  }, [filterFiles]);

  useEffect(() => {
    filterEmails();
  }, [filterEmails]);

  // ===== Navegación Drive =====
  const handleBack = () => {
    if (folderStack.length > 1) {
      const newStack = folderStack.slice(0, -1);
      const prev = newStack[newStack.length - 1];
      setFolderStack(newStack);
      loadDriveFiles(prev.id, false, prev.name);
    }
  };

  const goToRoot = () => {
    setFolderStack([{ id: 'root', name: 'Mi unidad' }]);
    loadDriveFiles('root', false, 'Mi unidad');
  };

  // ===== Helpers UI =====
  const handleOpenEmail = (emailId) => {
    setSelectedEmailId(emailId);
  };

  const handleCloseEmail = () => {
    setSelectedEmailId(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '';
    if (mimeType.includes('pdf')) return '';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      return '';
    if (mimeType.includes('document') || mimeType.includes('word')) return '';
    if (mimeType.includes('image')) return '';
    if (mimeType.includes('video')) return '';
    if (mimeType.includes('audio')) return '';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '';
    if (mimeType.includes('folder')) return '';
    return '';
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      window.location.href = '/';
    } catch (err) {
      console.error('Error cerrando sesión:', err);
      window.location.href = '/';
    }
  };

  // ===== Estados globales =====
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Cargando información...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2> Error</h2>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          className="load-btn"
        >
          Volver al login
        </button>
      </div>
    );
  }

  console.log('DEBUG admin front', {
    user,
    email: user?.email,
    adminsEnv: import.meta.env.VITE_ADMIN_EMAILS,
    userIsAdmin,
  });

  // ===== VISTA NO-ADMIN =====
if (!userIsAdmin) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>SupervitecSGD</h1>
          <span className="header-subtitle">Portal de Usuario</span>
        </div>
        <div className="user-info">
          {user?.picture && (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          )}
          <div className="user-details">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-btn"
            title="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <UserView user={user} />
      </main>
    </div>
  );
}

// ===== VISTA ADMIN =====
return (
  <div className="dashboard">
    <header className="dashboard-header">
      <div className="header-left">
        <h1>SupervitecSGD</h1>
        <span className="header-subtitle">Dashboard de Gestión</span>
      </div>
      
      <div className="user-info">
        {user?.picture && (
          <img src={user.picture} alt={user.name} className="user-avatar" />
        )}
        <div className="user-details">
          <p className="user-name">{user?.name}</p>
          <p className="user-email">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn"
          title="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <main className="dashboard-content">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <img src={dashboardIcon} alt="Dashboard" className="nav-icon-img" />
            <span className="nav-label">Dashboard</span>
          </button>

          {userIsAdmin && (
            <>
              <button
                type="button"
                className={`nav-item ${activeTab === 'emails' ? 'active' : ''}`}
                onClick={() => setActiveTab('emails')}
              >
                <img src={gmailIcon} alt="Gmail" className="nav-icon-img" />
                <span className="nav-label">Gmail</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`}
                onClick={() => setActiveTab('drive')}
              >
                <img src={driveIcon} alt="Google Drive" className="nav-icon-img" />
                <span className="nav-label">Google Drive</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'forms' ? 'active' : ''}`}
                onClick={() => setActiveTab('forms')}
              >
                <img src={formsIcon} alt="Google Forms" className="nav-icon-img" />
                <span className="nav-label">Google Forms</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'preop' ? 'active' : ''}`}
                onClick={() => setActiveTab('preop')}
              >
                <img src={fileIcon} alt="Preop" className="nav-icon-img" />
                <span className="nav-label">Preoperacionales</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'preop-users' ? 'active' : ''}`}
                onClick={() => setActiveTab('preop-users')}
              >
                <img src={folderIcon} alt="Users" className="nav-icon-img" />
                <span className="nav-label">Editar usuarios</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                <img src={emailIcon} alt="Review" className="nav-icon-img" />
                <span className="nav-label">Informe revisión</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setActiveTab('calendar')}
              >
                <img src={calendarIcon} alt="Calendario" className="nav-icon-img" />
                <span className="nav-label">Calendario Laboral</span>
              </button>

              {/*  BOTÓN CITACIONES - CORREGIDO PARA MANTENER ESTILO */}
              <button
                type="button"
                className={`nav-item ${activeTab === 'citations' ? 'active' : ''}`}
                onClick={() => setActiveTab('citations')}
              >
                <span className="nav-icon-img" style={{ fontSize: '24px' }}></span>
                <span className="nav-label">Citaciones</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* CONTENT AREA */}
      <div className="content-area">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <h2 className="page-title">
              <img src={dashboardIcon} alt="" className="page-title-icon" />
              Panel de Control
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <img src={emailIcon} alt="Correos" className="stat-icon-img" />
                <div className="stat-info">
                  <h3>{stats.totalEmails}</h3>
                  <p>Correos de Proyectos</p>
                </div>
                <button
                  type="button"
                  onClick={loadEmails}
                  className="stat-action"
                  disabled={loadingEmails}
                >
                  {loadingEmails ? '' : 'Actualizar'}
                </button>
              </div>
              <div className="stat-card">
                <img src={driveIcon} alt="Carpetas" className="stat-icon-img" />
                <div className="stat-info">
                  <h3>{stats.totalFolders}</h3>
                  <p>Carpetas en Drive</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('drive')}
                  className="stat-action"
                >
                  Ver Carpetas
                </button>
              </div>
              <div className="stat-card">
                <img src={fileIcon} alt="Archivos" className="stat-icon-img" />
                <div className="stat-info">
                  <h3>{stats.totalFiles}</h3>
                  <p>Archivos en Drive</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('drive')}
                  className="stat-action"
                >
                  Ver archivos
                </button>
              </div>
              <div className="stat-card">
                <img src={formsIcon} alt="Formularios" className="stat-icon-img" />
                <div className="stat-info">
                  <h3>{stats.totalForms}</h3>
                  <p>Formularios</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('forms')}
                  className="stat-action"
                >
                  Ver formularios
                </button>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Acciones Rápidas</h3>
              <div className="actions-grid">
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => {
                    setActiveTab('emails');
                    loadEmails();
                  }}
                >
                  <img src={gmailIcon} alt="" className="action-icon" />
                  Cargar Correos
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setActiveTab('drive')}
                >
                  <img src={driveIcon} alt="" className="action-icon" />
                  Ver Archivos
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setActiveTab('forms')}
                >
                  <img src={formsIcon} alt="" className="action-icon" />
                  Ver Formularios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EMAILS TAB */}
        {activeTab === 'emails' && (
          <div className="tab-content">
            <div className="page-header">
              <h2 className="page-title">
                <img src={gmailIcon} alt="" className="page-title-icon" />
                Correos de Proyectos
              </h2>
              <button
                type="button"
                onClick={loadEmails}
                disabled={loadingEmails}
                className="refresh-btn"
              >
                {loadingEmails ? ' Cargando...' : ' Recargar'}
              </button>
            </div>

            {emails.length > 0 && (
              <div className="gmail-header">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Buscar en correos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="clear-search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredEmails.length > 0 && (
              <div className="emails-section">
                <p className="results-count">
                  {filteredEmails.length}{' '}
                  {filteredEmails.length === 1
                    ? 'correo encontrado'
                    : 'correos encontrados'}
                </p>
                <div className="emails-list">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className="email-card"
                      onClick={() => handleOpenEmail(email.id)}
                    >
                      <div className="email-header">
                        <strong>{email.subject || '(Sin asunto)'}</strong>
                        <span className="email-date">
                          {email.date
                            ? new Date(email.date).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <div className="email-from">De: {email.from}</div>
                      <div className="email-snippet">{email.snippet}</div>
                      <div className="email-actions">
                        <span className="view-email-hint">
                          Click para ver completo →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emails.length === 0 && !loadingEmails && (
              <div className="empty-state">
                <p> Bandeja vacía (No hay correos)</p>
                <button type="button" onClick={loadEmails} className="load-btn">
                  Cargar Correos
                </button>
              </div>
            )}

            {loadingEmails && (
              <div className="loading">
                <div className="spinner" />
                <p>Cargando correos...</p>
              </div>
            )}
          </div>
        )}

        {/* DRIVE TAB */}
        {userIsAdmin && activeTab === 'drive' && (
          <div className="tab-content">
            <div className="page-header">
              <h2 className="page-title">
                <img src={driveIcon} alt="" className="page-title-icon" />
                Google Drive — {currentFolderName}
              </h2>
              <div className="drive-actions">
                <button
                  type="button"
                  onClick={goToRoot}
                  disabled={loadingFiles}
                  className="refresh-btn"
                >
                   Mi unidad
                </button>
                {folderStack.length > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loadingFiles}
                    className="back-btn-small"
                  >
                    ⬅ Atrás
                  </button>
                )}
              </div>
            </div>

            <div className="breadcrumb">
              <span className="breadcrumb-label"></span>
              {folderStack.map((folder, index) => (
                <span key={folder.id}>
                  {index > 0 && <span className="breadcrumb-separator">/</span>}
                  <span
                    className={
                      index === folderStack.length - 1
                        ? 'breadcrumb-current'
                        : 'breadcrumb-item'
                    }
                    onClick={() => {
                      if (index < folderStack.length - 1) {
                        const newStack = folderStack.slice(0, index + 1);
                        setFolderStack(newStack);
                        loadDriveFiles(folder.id, false, folder.name);
                      }
                    }}
                  >
                    {folder.name}
                  </span>
                </span>
              ))}
            </div>

            {driveFiles.length > 0 && (
              <div className="filters-container">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Buscar archivos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="clear-search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todos los archivos</option>
                  <option value="folder">Carpetas</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="word">Word</option>
                  <option value="image">Imágenes</option>
                </select>
              </div>
            )}

            {loadingFiles && (
              <div className="loading">
                <div className="spinner" />
                <p className="loading-text">Cargando archivos...</p>
              </div>
            )}

            {!loadingFiles && filteredFiles.length > 0 && (
              <div className="files-section">
                <p className="results-count">
                  {filteredFiles.length}{' '}
                  {filteredFiles.length === 1 ? 'elemento' : 'elementos'}
                </p>
                <div className="files-grid">
                  {filteredFiles.map((file) =>
                    file.mimeType === 'application/vnd.google-apps.folder' ? (
                      <div
                        key={file.id}
                        className="file-card folder-card"
                        onClick={() => loadDriveFiles(file.id, true, file.name)}
                      >
                        <div className="file-icon">
                          <span className="file-emoji"></span>
                        </div>
                        <div className="file-info">
                          <div className="file-name">
                            <strong>{file.name}</strong>
                          </div>
                          <div className="file-meta">
                            <span className="file-date">
                              {new Date(file.modifiedTime).toLocaleDateString(
                                'es-CO'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={file.id} className="file-card">
                        <div className="file-icon">
                          <span className="file-emoji">
                            {getFileIcon(file.mimeType)}
                          </span>
                        </div>
                        <div className="file-info">
                          <div className="file-name" title={file.name}>
                            {file.name}
                          </div>
                          <div className="file-meta">
                            <span className="file-size">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="file-date">
                              {new Date(file.modifiedTime).toLocaleDateString(
                                'es-CO'
                              )}
                            </span>
                          </div>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver en Drive →
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {!loadingFiles &&
              driveFiles.length > 0 &&
              filteredFiles.length === 0 && (
                <div className="empty-state">
                  <p> No se encontraron resultados</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setFileTypeFilter('all');
                    }}
                    className="load-btn"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

            {!loadingFiles && driveFiles.length === 0 && (
              <div className="empty-state">
                <p> Esta carpeta está vacía</p>
              </div>
            )}
          </div>
        )}

        {/* FORMS TAB */}
        {userIsAdmin && activeTab === 'forms' && (
          <div className="tab-content">
            <FormsPanel />
          </div>
        )}

        {/* PREOP TAB */}
        {userIsAdmin && activeTab === 'preop' && (
          <div className="tab-content">
            <AdminPreopPanel />
          </div>
        )}

        {/* PREOP USERS TAB */}
        {userIsAdmin && activeTab === 'preop-users' && (
          <div className="tab-content">
            <PreopUsersAdmin />
          </div>
        )}

        {/* REVIEW TAB */}
        {userIsAdmin && activeTab === 'review' && (
          <div className="tab-content">
            <AdminReviewPage />
          </div>
        )}

        {/* CALENDAR TAB */}
        {userIsAdmin && activeTab === 'calendar' && (
          <div className="tab-content">
            <WorkCalendarPanel />
          </div>
        )}

        {/*  CITATIONS TAB - AGREGADO AQUÍ */}
        {userIsAdmin && activeTab === 'citations' && (
          <div className="tab-content">
            <CitationsPanel />
          </div>
        )}
      </div>
    </main>

    {/* EMAIL MODAL */}
    {selectedEmailId && (
      <EmailModal
        key={selectedEmailId}
        emailId={selectedEmailId}
        onClose={handleCloseEmail}
      />
    )}
  </div>
);
}
