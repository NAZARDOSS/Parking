import { useState } from 'react';
import { apiRequest } from '../../config/apiClient.js';

function ForgotPasswordForm({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setDevResetUrl('');
    setError('');

    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { email },
      });

      setMessage(data.message || 'If an account exists, a password reset link has been sent');
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 text-white flex flex-col justify-center items-center p-6">
      <h2 className="text-2xl font-bold mb-2">Reset password</h2>
      <p className="text-sm mb-6 text-gray-300 text-center max-w-sm">
        Enter your email and we will send a reset link.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded"
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        {message && <p className="text-green-400 text-center">{message}</p>}
        {devResetUrl && (
          <a
            href={devResetUrl}
            className="block text-center text-purple-300 hover:underline break-all"
          >
            Open development reset link
          </a>
        )}
        {error && <p className="text-red-500 text-center">{error}</p>}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full text-sm text-purple-400 hover:underline"
        >
          Back to log in
        </button>
      </form>
    </div>
  );
}

export default ForgotPasswordForm;
