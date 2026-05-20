import { Suspense, lazy, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './components/public/MainPage';
import ResetPasswordPage from './components/public/ResetPasswordPage';
import { apiRequest, getAuthToken } from './config/apiClient.js';
import { GOOGLE_CLIENT_ID } from './config/env.js';
import './App.css';

const Map = lazy(() => import('./components/private/Map.jsx'));

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = getAuthToken();

      if (!token) {
        setIsLoggedIn(false);
        setAuthChecked(true);
        return;
      }

      try {
        await apiRequest('/auth/user-info');
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    };

    verifyToken();
  }, []);

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        Loading...
      </div>
    );
  }

  const routes = (
    <Routes>
      <Route
        path="/"
        element={<MainPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
      />
      <Route
        path="/map"
        element={
          isLoggedIn ? (
            <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>}>
              <Map setIsLoggedIn={setIsLoggedIn} />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage setIsLoggedIn={setIsLoggedIn} />}
      />
    </Routes>
  );

  return (
    <Router>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {routes}
        </GoogleOAuthProvider>
      ) : (
        routes
      )}
    </Router>
  );
}

export default App;
