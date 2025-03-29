import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import cookieParser from 'cookie-parser';
import patientRoutes from './routes/patients';
import scanRoutes from './routes/scans';
import treatmentPlanRoutes from './routes/treatmentPlans';
import authRoutes from './routes/auth';
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/scans', authenticateToken, scanRoutes);
app.use('/api/treatment-plans', authenticateToken, treatmentPlanRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API URL: http://localhost:${port}/api`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
}); 