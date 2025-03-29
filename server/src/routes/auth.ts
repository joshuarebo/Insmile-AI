import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Temporary user for testing (replace with database in production)
const TEST_USER = {
  id: 1,
  email: 'test@example.com',
  password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqD1ZxQQxq5e', // password123
  fullName: 'Test User',
  role: 'admin',
  clinicId: 1,
  tokens: 100,
  phone: '1234567890'
};

// In-memory storage for registered users (replace with database in production)
const registeredUsers = new Map();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);

  try {
    if (email === TEST_USER.email) {
      const isValidPassword = await bcrypt.compare(password, TEST_USER.password);
      
      if (isValidPassword) {
        const token = jwt.sign(
          { 
            id: TEST_USER.id, 
            email: TEST_USER.email,
            role: TEST_USER.role 
          },
          process.env.JWT_SECRET || 'insmile-ai-secret-key-2024',
          { expiresIn: '24h' }
        );

        // Set the token in an HTTP-only cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Return user data without sensitive information
        const { password: _, ...userData } = TEST_USER;
        console.log('Login successful for:', email);
        res.json(userData);
      } else {
        console.log('Invalid password for:', email);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      console.log('User not found:', email);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, fullName, role, clinicId, phone } = req.body;
  console.log('Registration attempt for:', email);

  try {
    // Check if user already exists
    if (email === TEST_USER.email || registeredUsers.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: registeredUsers.size + 2, // Start from 2 since TEST_USER is 1
      email,
      password: hashedPassword,
      fullName,
      role: role || 'patient',
      clinicId,
      tokens: 100,
      phone
    };

    // Store user (replace with database in production)
    registeredUsers.set(email, newUser);

    console.log('Registration successful for:', email);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        clinicId: newUser.clinicId,
        tokens: newUser.tokens,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/user', (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    console.log('No token found in request');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'insmile-ai-secret-key-2024');
    const { password: _, ...userData } = TEST_USER;
    console.log('User data retrieved for:', userData.email);
    res.json(userData);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router; 