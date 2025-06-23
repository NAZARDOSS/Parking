import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import parking from '../../assets/parking-icon.svg';
import RegistrationForm from './RegistrationForm';
import LogInForm from './LoginForm';
import { useNavigate } from 'react-router-dom';

function MainPage(props) {
  const [isRegistering, setIsRegistering] = useState(true);
  const navigate = useNavigate()
  
  useEffect(() => {
    if (props.isLoggedIn) {
      navigate('/map');
    }
  }, [props.isLoggedIn, navigate]);

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="flex h-screen font-sans">
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <img src={parking} alt="Parking" className="w-72 h-72 opacity-50" />
        </div>
        {isRegistering ? (
          <RegistrationForm onSwitchToLogin={() => setIsRegistering(false)} isLoggedIn = {props.isLoggedIn} setIsLoggedIn = {props.setIsLoggedIn} />
        ) : (
          <LogInForm onSwitchToRegister={() => setIsRegistering(true)} isLoggedIn = {props.isLoggedIn} setIsLoggedIn = {props.setIsLoggedIn} />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default MainPage;
