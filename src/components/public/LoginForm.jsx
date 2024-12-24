import React, { useState } from 'react';

function LogInForm({ onSwitchToRegister }) {
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

  const handleSubmitLogin = (e) => {
    e.preventDefault();
    console.log('Log in successful:', formData);
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
        >
          Log In
        </button>
        <p className="text-center text-sm text-gray-400">Or log in with</p>
        <div className="flex space-x-4">
          <button
            type="button"
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded"
          >
            Google
          </button>
          <button
            type="button"
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded"
          >
            Apple
          </button>
        </div>
      </form>
    </div>
  );
}

export default LogInForm;
