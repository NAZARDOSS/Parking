import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Map from './components/private/Map';
import MainPage from './components/public/MainPage';
import './App.css';

const API_URL = `http://${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}/api`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('token: ', token);
    
    
    if (token) {
      fetch(`${API_URL}/auth/user-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<MainPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/map"
          element={
            isLoggedIn ? (
              <Map setIsLoggedIn = {setIsLoggedIn}/>
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
