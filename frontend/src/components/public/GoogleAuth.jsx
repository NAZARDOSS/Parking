import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom'; 

const API_URL = `${process.env.REACT_APP_HOST}:8080/api`;

function GoogleAuth({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const handleGoogleLoginSuccess = async (response) => {
    try {
      const idToken = response?.credential;
      console.log('Google login response:', response);

      const serverResponse = await fetch(
        `${API_URL}/auth/google-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: idToken }),
        },
      );

      if (serverResponse.ok) {
        const responseData = await serverResponse.json();
        console.log('Google login successful:', responseData);
        localStorage.setItem('token', responseData.token); 

        setIsLoggedIn(true);
        navigate('/map');

        alert('Successfully logged in with Google!');
      } else {
        const errorData = await serverResponse.json();
        console.error('Failed to log in with Google:', errorData);
        alert(
          'Failed to log in with Google: ' +
            (errorData.message || 'Unknown error'),
        );
      }
    } catch (error) {
      console.error('Error during Google login:', error);
      alert('There was an error with Google login.');
    }
  };

  const handleGoogleLoginFailure = (error) => {
    console.error('Google login failed:', error);
    alert('Failed to log in with Google.');
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleLoginSuccess}
      onError={handleGoogleLoginFailure}
      useOneTap
      theme="filled_black"
      size="large"
      text="signin_with"
    />
  );
}

export default GoogleAuth;
