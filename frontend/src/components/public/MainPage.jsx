import { useState, useEffect } from 'react';
import parking from '../../assets/parking-icon.svg';
import RegistrationForm from './RegistrationForm';
import LogInForm from './LoginForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import { useNavigate } from 'react-router-dom';
import { GOOGLE_CLIENT_ID } from '../../config/env.js';

function MainPage(props) {
  const [authMode, setAuthMode] = useState('register');
  const navigate = useNavigate()
  const isGoogleEnabled = Boolean(GOOGLE_CLIENT_ID);
  
  useEffect(() => {
    if (props.isLoggedIn) {
      navigate('/map');
    }
  }, [props.isLoggedIn, navigate]);

  return (
    <div className="flex h-screen font-sans">
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <img src={parking} alt="Parking" className="w-72 h-72 opacity-50" />
      </div>
      {authMode === 'register' && (
        <RegistrationForm
          onSwitchToLogin={() => setAuthMode('login')}
          isLoggedIn={props.isLoggedIn}
          setIsLoggedIn={props.setIsLoggedIn}
          isGoogleEnabled={isGoogleEnabled}
        />
      )}
      {authMode === 'login' && (
        <LogInForm
          onSwitchToRegister={() => setAuthMode('register')}
          onForgotPassword={() => setAuthMode('forgot')}
          isLoggedIn={props.isLoggedIn}
          setIsLoggedIn={props.setIsLoggedIn}
          isGoogleEnabled={isGoogleEnabled}
        />
      )}
      {authMode === 'forgot' && (
        <ForgotPasswordForm onSwitchToLogin={() => setAuthMode('login')} />
      )}
    </div>
  );
}

export default MainPage;
