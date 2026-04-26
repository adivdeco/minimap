import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import LoadingSpinner from './components/LoadingSpinner';
import './index.css';

// Lazy Load Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/Home'));
const AddLibrary = lazy(() => import('./pages/AddLibrary'));
const AllUsers = lazy(() => import('./pages/AllUsers'));
const AllLibraries = lazy(() => import('./pages/AllLibraries'));
const MyLibraries = lazy(() => import('./pages/MyLibraries'));
const EditLibrary = lazy(() => import('./pages/EditLibrary'));
const LibraryDetails = lazy(() => import('./pages/LibraryDetails'));
const LibraryAdminPanel = lazy(() => import('./pages/LibraryAdminPanel'));
const Profile = lazy(() => import('./pages/Profile'));
const ManageUsers = lazy(() => import('./components/LibraryUsersManagement'));
const ManageQuestions = lazy(() => import('./pages/ManageQuestions'));

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const Quizzes = lazy(() => import('./pages/Quizzes'));
const QuizRunner = lazy(() => import('./pages/QuizRunner'));
const QuizResults = lazy(() => import('./pages/QuizResults'));

function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/add-library" element={<ProtectedRoute><AddLibrary /></ProtectedRoute>} />
                <Route path="/libraries" element={<ProtectedRoute><AllLibraries /></ProtectedRoute>} />
                <Route path="/library/:id" element={<ProtectedRoute><LibraryDetails /></ProtectedRoute>} />
                <Route path="/my-libraries" element={<ProtectedRoute><MyLibraries /></ProtectedRoute>} />
                <Route path="/edit-library/:id" element={<ProtectedRoute><EditLibrary /></ProtectedRoute>} />
                <Route path="/library/:id/admin" element={<ProtectedRoute><LibraryAdminPanel /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><AllUsers /></ProtectedRoute>} />
                <Route path="/library/:id/users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
                <Route path="/quizzes/:id/manage" element={<ProtectedRoute><ManageQuestions /></ProtectedRoute>} />
                <Route path="/test-runner/:id" element={<ProtectedRoute><QuizRunner /></ProtectedRoute>} />
                <Route path="/quiz-results/:id" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
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
              theme="colored"
            />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </Auth0Provider>
  );
}

export default App;
