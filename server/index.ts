import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createServer } from 'http';
import analyzeDentalImageRouter from './routes/analyzeDentalImage';
import { setupVite, serveStatic, log } from "./vite";
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import scanRoutes from './routes/scans';
import treatmentPlanRoutes from './routes/treatmentPlans';
import chatRoutes from './routes/chat';
import { authenticateToken } from './middleware/auth';

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const server = createServer(app);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
})); // Security headers with CSP disabled for development
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API Routes
app.use('/api/analyze-dental-image', analyzeDentalImageRouter);
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/scans', authenticateToken, scanRoutes);
app.use('/api/treatment-plans', authenticateToken, treatmentPlanRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
} else {
  // Set up Vite in development
  (async () => {
    await setupVite(app, server);
    const port = process.env.PORT || 3001;
    server.listen(port, () => {
      log(`Server running on port ${port}`);
    });
  })();
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
