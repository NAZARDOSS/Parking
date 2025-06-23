import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate,} from 'react-router-dom';
import Map from './components/private/Map';
import MainPage from './components/public/MainPage';
import './App.css';

const API_URL = `${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}/api`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('token: ', token);

    if (token) {
      fetch(`${API_URL}/auth/user-info`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          console.log('response userInfo: ', response);

          if (response.ok) {
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          setIsLoggedIn(false);
        });
    }
  }, []);

  // Кнопка с логикой авторизации и перехода
  const LoginButton = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      setIsLoggedIn(true);
      navigate('/map');
    };

    return (
      <button onClick={handleLogin} style={{ position: 'fixed', top: 10, right: 10, color: 'white' }}>
        Without Registration
      </button>
    );
  };

  return (
    <Router>
      <LoginButton />
      <Routes>
        <Route
          path="/"
          element={<MainPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/map"
          element={
            isLoggedIn ? (
              <Map setIsLoggedIn={setIsLoggedIn} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
