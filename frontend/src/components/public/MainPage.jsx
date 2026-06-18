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
      <div className="hidden flex-1 flex-col items-center justify-center gap-6 bg-[#031A3A] md:flex">
        <img src={parking} alt="Parking" className="h-40 w-40 opacity-30" />
        <div className="text-center">
          <div className="text-2xl font-bold text-white">ParkWise</div>
          <div className="mt-1 text-sm text-slate-400">Find parking · Plan routes · Save time</div>
        </div>
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
