import React, { useState } from 'react';
import parking from '../../assets/parking-icon.svg';
import RegistrationForm from './RegistrationForm'
import LogInForm from './LoginForm'
function MainPage() {
  const [isRegistering, setIsRegistering] = useState(true);

  return (
    <div className="flex h-screen font-sans">
      {/* Left map section */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <img src={parking} alt="Parking" className="w-72 h-72 opacity-50" />
      </div>

      {/* Right dynamic form */}
      {isRegistering ? (
        <RegistrationForm onSwitchToLogin={() => setIsRegistering(false)} />
      ) : (
        <LogInForm onSwitchToRegister={() => setIsRegistering(true)} />
      )}
    </div>
  );
}

export default MainPage;
