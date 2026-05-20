import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, setAuthToken } from '../../config/apiClient.js';

function ResetPasswordPage({ setIsLoggedIn }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token, password },
      });

      setAuthToken(data.token);
      setIsLoggedIn(true);
      navigate('/map');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans bg-gray-900 text-white justify-center items-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">Choose new password</h2>
        {!token && (
          <p className="text-red-500 text-center">
            Reset token is missing. Request a new password reset link.
          </p>
        )}
        <input
          type="password"
          name="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded"
        >
          {loading ? 'Saving...' : 'Reset password'}
        </button>
        {error && <p className="text-red-500 text-center">{error}</p>}
      </form>
    </div>
  );
}

export default ResetPasswordPage;
