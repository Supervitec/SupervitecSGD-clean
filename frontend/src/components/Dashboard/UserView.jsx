import { useState } from 'react';
import FormsList from './Forms/FormsList';
import PreopPage from '../Preop/PreopPage';
import './UserView.css';

function UserView({ user }) {
  const [activeTab, setActiveTab] = useState('formularios');

  return (
    <div className="user-view">
      <div className="user-header">
        <h1>Bienvenido, {user?.name || 'Usuario'}</h1>
        <p>Selecciona una opción para continuar</p>
      </div>

      <div className="user-tabs">
        <button
          className={activeTab === 'formularios' ? 'active' : ''}
          onClick={() => setActiveTab('formularios')}
        >
         Formularios Disponibles
        </button>
        <button
          className={activeTab === 'preoperacional' ? 'active' : ''}
          onClick={() => setActiveTab('preoperacional')}
        >
        Inspección Preoperacional
        </button>
      </div>

      <div className="user-content">
        {activeTab === 'formularios' && <FormsList userMode={true} />}
        {activeTab === 'preoperacional' && <PreopPage userMode={true} />}
      </div>
    </div>
  );
}

export default UserView;
