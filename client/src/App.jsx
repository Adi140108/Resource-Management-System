import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import VolunteerDashboard from './pages/volunteer/Dashboard';
import ManagerDashboard from './pages/manager/Dashboard';
import CreateEvent from './pages/manager/CreateEvent';
import EventControlPanel from './pages/manager/EventControlPanel';
import EventsList from './pages/manager/EventsList';
import LiveMonitor from './pages/manager/LiveMonitor';
import VolunteersPage from './pages/manager/VolunteersPage';

function Guard({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'manager' ? '/manager' : '/volunteer'} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='manager'?'/manager':'/volunteer'} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={user.role==='manager'?'/manager':'/volunteer'} /> : <Signup />} />

      {/* Volunteer */}
      <Route path="/volunteer" element={<Guard role="volunteer"><VolunteerDashboard /></Guard>} />
      <Route path="/volunteer/events" element={<Guard role="volunteer"><VolunteerDashboard /></Guard>} />

      {/* Manager */}
      <Route path="/manager" element={<Guard role="manager"><ManagerDashboard /></Guard>} />
      <Route path="/manager/events" element={<Guard role="manager"><EventsList /></Guard>} />
      <Route path="/manager/events/new" element={<Guard role="manager"><CreateEvent /></Guard>} />
      <Route path="/manager/events/:id" element={<Guard role="manager"><EventControlPanel /></Guard>} />
      <Route path="/manager/volunteers" element={<Guard role="manager"><VolunteersPage /></Guard>} />
      <Route path="/manager/monitor" element={<Guard role="manager"><LiveMonitor /></Guard>} />

      <Route path="*" element={<Navigate to={user ? (user.role==='manager'?'/manager':'/volunteer') : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
