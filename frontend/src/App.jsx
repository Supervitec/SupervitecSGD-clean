import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PreopLogin from './pages/PreopLogin';
import PreopApp from './pages/PreopApp';
import Dashboard from './components/Dashboard/Dashboard';
import PublicPreopSelector from './components/PublicPreop/PublicPreopSelector';
import PublicPreopForm from './components/PublicPreop/PublicPreopForm';
import FormResponsesAnalysis from './components/Dashboard/Forms/FormResponsesAnalysis';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/preop" element={<PreopLogin />} />
          <Route path="/preop/app" element={<PreopApp />} />
          <Route path="/preop-public" element={<PublicPreopSelector />} />
          <Route path="/preop-public" element={<PublicPreopSelector />} />
          <Route path="/preop-form/:type" element={<PublicPreopForm />} />
          <Route path="/forms/:formId/analysis" element={<FormResponsesAnalysis />} />

          
          {/* Dashboard protegido (admin con Google OAuth) */}
          <Route path="/dashboard/*" element={<Dashboard />} />
          
          {/* Redirect fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
