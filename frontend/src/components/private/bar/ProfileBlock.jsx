import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Icon } from "@iconify/react";
import { toggleProfileVisibility } from '../Store/store';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearAuthToken, getAuthToken } from '../../../config/apiClient.js';

function ProfileBlock({ setIsLoggedIn }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleClose = () => dispatch(toggleProfileVisibility());

  const confirmLogout = () => {
    clearAuthToken();
    setIsLoggedIn(false);
    navigate('/');
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = getAuthToken();
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/user-info');
        setUserInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const initials = userInfo
    ? (userInfo.firstName?.[0] || '') + (userInfo.lastName?.[0] || '')
    : '';

  return (
    <aside className="absolute bottom-5 left-24 z-30 w-72 overflow-hidden rounded-lg border border-blue-300/20 bg-[#031A3A]/95 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
            <Icon icon="fa6-solid:user" className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Profile</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Close profile"
        >
          <Icon icon="mdi:close" className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {userInfo && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-base font-bold text-blue-100">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold text-white">
                {userInfo.firstName} {userInfo.lastName}
              </div>
              <div className="truncate text-xs text-slate-400">{userInfo.email}</div>
            </div>
          </div>
        )}

        <div className="mt-4">
          {showConfirm ? (
            <div className="rounded-lg border border-red-300/20 bg-red-500/10 p-3">
              <div className="mb-3 text-sm text-red-100">Are you sure you want to log out?</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-md border border-white/10 bg-white/10 py-1.5 text-sm font-bold text-white hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="flex-1 rounded-md bg-red-500 py-1.5 text-sm font-bold text-white hover:bg-red-600"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-100 hover:bg-red-500/20"
            >
              <Icon icon="mdi:logout" className="h-4 w-4" />
              Log out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ProfileBlock;
