import React, { useState } from 'react';
import GoogleAuth from './GoogleAuth';
import { useNavigate } from 'react-router-dom'; 

function RegistrationForm({ onSwitchToLogin, setIsLoggedIn }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    if (name === 'email') {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(value) ? '' : 'Please enter a valid email.',
      }));
    }
    if (name === 'password') {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(value)
          ? ''
          : 'Password must be at least 8 characters long, include uppercase, lowercase, and a number.',
      }));
    }
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      alert('Please accept the Terms & Conditions');
      return;
    }

    if (errors.email || errors.password) {
      alert('Please fix the errors before submitting.');
      return;
    }

    const registrationData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    };

    try {
      const response = await fetch('http://localhost:5005/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Registration successful:', data);

        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
        navigate('/map');
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        alert('Registration failed: ' + errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('There was an error with your request.');
    }
  };

  return (
    <div className="flex-1 bg-gray-900 text-white flex flex-col justify-center items-center p-6">
      <h2 className="text-2xl font-bold mb-2">Create an account</h2>
      <p className="text-sm mb-6">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-purple-400 hover:underline"
        >
          Log in
        </button>
      </p>

      <form
        onSubmit={handleSubmitRegistration}
        className="w-full max-w-sm space-y-4"
      >
        <div className="flex space-x-2">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            className="w-1/2 px-4 py-2 text-gray-900 border border-gray-300 rounded"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            className="w-1/2 px-4 py-2 text-gray-900 border border-gray-300 rounded"
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
            className="h-4 w-4 text-purple-600"
          />
          <label className="text-sm">
            I agree to the{' '}
            <a href="/terms" className="text-purple-400 hover:underline">
              Terms & Conditions
            </a>
          </label>
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded"
        >
          Create account
        </button>
        <p className="text-center text-sm text-gray-400">Or register with</p>
        <div className="flex justify-center">
          <GoogleAuth setIsLoggedIn = {setIsLoggedIn} />
        </div>
      </form>
    </div>
  );
}

export default RegistrationForm;
