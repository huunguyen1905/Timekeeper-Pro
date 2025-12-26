import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Attendance from './pages/Attendance';
import BulkAttendance from './pages/BulkAttendance';
import Timeline from './pages/Timeline';
import Statistics from './pages/Statistics';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import { UserSession } from './types';
import { Toaster } from 'react-hot-toast';

function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('tk_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (session: UserSession) => {
    setUser(session);
    localStorage.setItem('tk_user', JSON.stringify(session));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tk_user');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-orange-50"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <HashRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="attendance" element={<Attendance user={user} />} />
          <Route path="requests" element={<Requests user={user} />} />
          <Route path="bulk" element={<BulkAttendance user={user} />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="profile" element={<Profile user={user} />} />
          <Route path="employees" element={user?.role === 'Admin' ? <Employees /> : <Navigate to="/" />} />
          <Route path="settings" element={user?.role === 'Admin' ? <Settings user={user} /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;