import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for MVP (replace with database later)
const users: any[] = [];
const passwordResetTokens: Map<string, { userId: string; expires: Date }> = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, clinicName } = req.body;

    // Check if user already exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      clinicName,
      role: 'user',
      createdAt: new Date()
    };

    users.push(user);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists with this email, a password reset link will be sent.' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token
    passwordResetTokens.set(resetToken, { userId: user.id, expires });

    // In a real application, send email with reset link
    // For MVP, just return the token
    res.json({
      message: 'Password reset link sent to email',
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Find reset token
    const resetData = passwordResetTokens.get(token);
    if (!resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (resetData.expires < new Date()) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Find user
    const user = users.find(u => u.id === resetData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Remove used token
    passwordResetTokens.delete(token);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = users.find(u => u.id === req.user?.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
}; 