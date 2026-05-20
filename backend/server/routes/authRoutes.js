import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/middleware.js';

const router = express.Router();

router.post('/signin', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.loginWithGoogle);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/user-info', authenticateToken, authController.getUserInfo);

export default router;
