import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import AddLibrary from './pages/AddLibrary';
import AllUsers from './pages/AllUsers';
import AllLibraries from './pages/AllLibraries';
import MyLibraries from './pages/MyLibraries'; // Owner view
import EditLibrary from './pages/EditLibrary';
import LibraryDetails from './pages/LibraryDetails';
import Profile from './pages/Profile';
import './index.css';

// Auth0 configuration - Replace with your Auth0 credentials
const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-tenant.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id',
  authorizationParams: {
    redirect_uri: window.location.origin
  }
};

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={auth0Config.authorizationParams}
    >
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/add-library" element={<ProtectedRoute><AddLibrary /></ProtectedRoute>} />
              <Route path="/libraries" element={<ProtectedRoute><AllLibraries /></ProtectedRoute>} />
              <Route path="/library/:id" element={<ProtectedRoute><LibraryDetails /></ProtectedRoute>} />
              <Route path="/my-libraries" element={<ProtectedRoute><MyLibraries /></ProtectedRoute>} />
              <Route path="/edit-library/:id" element={<ProtectedRoute><EditLibrary /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><AllUsers /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </Auth0Provider>
  );
}

export default App;
