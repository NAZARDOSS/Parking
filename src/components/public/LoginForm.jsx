import React, { useState } from 'react';
import GoogleAuth from './GoogleAuth';
import { useNavigate } from 'react-router-dom';

function LogInForm({ onSwitchToRegister, setIsLoggedIn }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5005/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      console.log('Log in successful:', data);
      setIsLoggedIn(true);
      navigate('/map');
    } catch (error) {
      console.error('Error during login:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 text-white flex flex-col justify-center items-center p-6">
      <h2 className="text-2xl font-bold mb-2">Log In</h2>
      <p className="text-sm mb-6">
        Don’t have an account?{' '}
        <button
          onClick={onSwitchToRegister}
          className="text-purple-400 hover:underline"
        >
          Create one
        </button>
      </p>

      <form onSubmit={handleSubmitLogin} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Log In'}
        </button>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <p className="text-center text-sm text-gray-400">Or log in with</p>
        <div className="flex justify-center">
          <GoogleAuth setIsLoggedIn={setIsLoggedIn} />
        </div>
      </form>
    </div>
  );
}

export default LogInForm;
