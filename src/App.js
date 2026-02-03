import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login/Login';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import './App.css';



function AppContent() {
  const { user, userRole } = useAuth();

  if (!user) {
    return <Login />;
  }

  return userRole === 'admin' ? <AdminDashboard /> : <StaffDashboard />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
