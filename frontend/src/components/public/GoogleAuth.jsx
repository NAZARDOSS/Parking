import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom'; 
import { apiRequest, setAuthToken } from '../../config/apiClient.js';

function GoogleAuth({ setIsLoggedIn, text = 'continue_with' }) {
  const navigate = useNavigate();
  const handleGoogleLoginSuccess = async (response) => {
    try {
      const idToken = response?.credential;
      const responseData = await apiRequest('/auth/google-login', {
        method: 'POST',
        auth: false,
        body: { token: idToken },
      });

      setAuthToken(responseData.token);
      setIsLoggedIn(true);
      navigate('/map');
    } catch (error) {
      alert(error.message || 'There was an error with Google login.');
    }
  };

  const handleGoogleLoginFailure = () => {
    alert('Failed to log in with Google.');
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleLoginSuccess}
      onError={handleGoogleLoginFailure}
      theme="filled_black"
      size="large"
      text={text}
    />
  );
}

export default GoogleAuth;
