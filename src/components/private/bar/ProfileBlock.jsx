import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toggleProfileVisibility } from '../Store/store';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const API_URL = `http://${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}/api`;
function ProfileBlock({setIsLoggedIn}) {
  const [position, setPosition] = useState({ top: 100, left: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        top: e.clientY - dragStart.y,
        left: e.clientX - dragStart.x,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClose = () => {
    dispatch(toggleProfileVisibility());
  };

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No token found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/user-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user information');
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setOpenLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
    setIsLoggedIn(false)
  };

  const cancelLogout = () => {
    setOpenLogoutModal(false);
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return (
    <div
      className="w-72 bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center absolute cursor-move select-none"
      style={{ top: position.top, left: position.left }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <h2 className="text-xl font-bold mb-2">Profile</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {userInfo && (
        <div className="text-center">
          <p className="text-gray-700 font-bold">First Name: {userInfo.firstName}</p>
          <p className="text-gray-700 font-bold">Last Name: {userInfo.lastName}</p>
          <p className="text-gray-700 font-bold">Email: {userInfo.email}</p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="mt-4 bg-red-500 text-white py-2 px-4 rounded"
      >
        Logout
      </button>

      <button
        onClick={handleClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
      >
        ×
      </button>

      <Dialog open={openLogoutModal} onClose={cancelLogout}>
        <DialogTitle>Are you sure you want to log out?</DialogTitle>
        <DialogActions>
          <Button onClick={cancelLogout} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmLogout} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default ProfileBlock;
