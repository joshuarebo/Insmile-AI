import express from 'express';
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router; 