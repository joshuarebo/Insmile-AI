import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";
import { 
  loginSchema, 
  insertUserSchema, 
  insertPatientSchema, 
  insertScanSchema, 
  insertAnalysisSchema, 
  insertTreatmentPlanSchema,
  insertActivitySchema,
  insertSubscriptionSchema,
  insertApiKeySchema,
  insertTransactionSchema,
  insertWalletSchema,
  SUBSCRIPTION_TYPES,
  SERVICE_TYPES
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import multer from 'multer';
import { storageService } from './services/storage';
import { VerifyCallback } from "passport-google-oauth20";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: string;
  clinicId: number | null;
  tokens: number | null;
  createdAt: Date | null;
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      email: string;
      fullName: string;
      role: string;
      clinicId: number | null;
      tokens: number | null;
      createdAt: Date | null;
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session management
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "insmile_ai_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Set up Passport authentication
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Verify hashed password
        const [salt, storedHash] = user.password.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        
        if (storedHash !== hash) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found'));
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to ensure authentication
  const ensureAuthenticated = (req: Request, res: Response, next: () => void) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to ensure admin role
  const ensureAdmin = (req: Request, res: Response, next: () => void) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Admin access required" });
  };

  // Authentication routes
  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string }) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check for existing username
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Registration failed",
          error: "Username already exists. Please choose a different username or try logging in."
        });
      }
      
      // Check for existing email
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ 
          message: "Registration failed",
          error: "Email already in use. Please use a different email or try logging in."
        });
      }

      // Hash the password
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(validatedData.password, salt, 1000, 64, 'sha512').toString('hex');
      validatedData.password = `${salt}:${hash}`;

      const user = await storage.createUser(validatedData);
      const { password, ...userWithoutPassword } = user;
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "user_registered",
        description: `New user registered: ${user.fullName}`,
        entityType: "user",
        entityId: user.id
      });

      res.status(201).json({
        message: "Registration successful",
        user: userWithoutPassword
      });
    } catch (error) {
      res.status(400).json({ 
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Invalid request data"
      });
    }
  });

  app.get("/api/auth/user", ensureAuthenticated, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Patient routes
  app.get("/api/patients", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let patients;
      if (user.role === "admin") {
        // Admin can see all patients in their clinic
        patients = await storage.getPatientsByClinic(user.clinicId);
      } else {
        // Dentists can see all patients in their clinic as well
        patients = await storage.getPatientsByClinic(user.clinicId);
      }
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients", error });
    }
  });

  app.get("/api/patients/:id", ensureAuthenticated, async (req, res) => {
    try {
      const patient = await storage.getPatient(parseInt(req.params.id));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient", error });
    }
  });

  app.post("/api/patients", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const user = req.user as any;
      const patient = await storage.createPatient({
        ...validatedData,
        clinicId: user.clinicId
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "patient_created",
        description: `New patient ${patient.fullName} created`,
        entityType: "patient",
        entityId: patient.id
      });

      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.put("/api/patients/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const updatedPatient = await storage.updatePatient(id, req.body);
      
      // Log activity
      const user = req.user as any;
      await storage.createActivity({
        userId: user.id,
        action: "patient_updated",
        description: `Patient ${patient.fullName} updated`,
        entityType: "patient",
        entityId: patient.id
      });

      res.json(updatedPatient);
    } catch (error) {
      res.status(400).json({ message: "Failed to update patient", error });
    }
  });

  // Scan routes
  app.get("/api/scans", async (req, res) => {
    try {
      const { search, status } = req.query;
      const user = req.user as any;

      // Get all scans for the user's clinic
      let scans = await storage.getScansByUser(user.id);

      // Apply search filter if provided
      if (search && typeof search === 'string') {
        scans = scans.filter(scan => 
          scan.fileName.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply status filter if provided
      if (status && typeof status === 'string' && status !== 'all') {
        scans = scans.filter(scan => scan.status === status);
      }

      // Sort by created date, newest first
      scans.sort((a, b) => {
        const dateA = a.uploadedAt?.getTime() || 0;
        const dateB = b.uploadedAt?.getTime() || 0;
        return dateB - dateA;
      });

      const formattedScans = await Promise.all(scans.map(async scan => {
        const patient = await storage.getPatient(scan.patientId);
        return {
          id: scan.id,
          patientId: scan.patientId,
          patientName: patient?.fullName || 'Unknown Patient',
          fileName: scan.fileName,
          fileType: scan.fileType,
          fileUrl: scan.fileUrl,
          status: scan.status,
          createdAt: scan.uploadedAt,
          updatedAt: null
        };
      }));

      res.json(formattedScans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  app.post("/api/scans", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertScanSchema.parse(req.body);
      const user = req.user as any;
      
      const scan = await storage.createScan({
        ...validatedData,
        uploadedBy: user.id
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "scan_uploaded",
        description: "New scan uploaded",
        entityType: "scan",
        entityId: scan.id
      });

      res.status(201).json(scan);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.post("/api/scans/:id/analyze", ensureAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Update scan status to analyzing
      await storage.updateScan(scanId, { status: "analyzing" });

      // Simulate AI analysis (would be real AI in production)
      const tokensUsed = Math.floor(Math.random() * 150000) + 50000;
      const analysisResults = simulateAIAnalysis();
      
      // Create analysis record
      const analysis = await storage.createAnalysis({
        scanId,
        results: analysisResults,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-99%
        tokensUsed
      });

      // Update scan status to completed and record tokens used
      await storage.updateScan(scanId, { 
        status: "completed",
        tokensUsed
      });

      // Deduct tokens from user
      const user = req.user as any;
      const updatedUser = await storage.updateUser(user.id, {
        tokens: Math.max(0, user.tokens - tokensUsed)
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "ai_analysis_completed",
        description: "AI analysis completed",
        entityType: "scan",
        entityId: scan.id
      });

      res.json({ analysis, tokensUsed, userTokensRemaining: updatedUser?.tokens });
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze scan", error });
    }
  });

  // File upload endpoint
  app.post("/api/scans/upload", ensureAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = req.user as any;
      const patientId = parseInt(req.body.patientId);
      const category = req.body.category;

      // Upload file to Azure Blob Storage
      const fileUrl = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Create scan record in database
      const scan = await storage.createScan({
        patientId,
        uploadedBy: user.id,
        fileName: req.file.originalname,
        fileType: category,
        fileUrl // Store the Azure Blob Storage URL
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "scan_uploaded",
        description: `New ${category} scan uploaded`,
        entityType: "scan",
        entityId: scan.id
      });

      res.status(201).json(scan);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        message: "Failed to upload file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Treatment plan routes
  app.get("/api/treatment-plans", ensureAuthenticated, async (req, res) => {
    try {
      const patientId = req.query.patientId;
      let plans;
      
      if (patientId) {
        plans = await storage.getTreatmentPlansByPatient(parseInt(patientId as string));
      } else {
        plans = await storage.getAllTreatmentPlans();
      }
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch treatment plans", error });
    }
  });

  app.post("/api/treatment-plans", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTreatmentPlanSchema.parse(req.body);
      const user = req.user as any;
      
      const plan = await storage.createTreatmentPlan({
        ...validatedData,
        createdBy: user.id
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "treatment_plan_created",
        description: "New treatment plan created",
        entityType: "treatment_plan",
        entityId: plan.id
      });

      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.put("/api/treatment-plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getTreatmentPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Treatment plan not found" });
      }
      
      const updatedPlan = await storage.updateTreatmentPlan(id, req.body);
      
      // Log activity
      const user = req.user as any;
      await storage.createActivity({
        userId: user.id,
        action: "treatment_plan_updated",
        description: "Treatment plan updated",
        entityType: "treatment_plan",
        entityId: plan.id
      });

      res.json(updatedPlan);
    } catch (error) {
      res.status(400).json({ message: "Failed to update treatment plan", error });
    }
  });

  // Activity routes
  app.get("/api/activities", ensureAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(limit);
      
      // Enrich activities with user and entity information
      const enrichedActivities = await Promise.all(activities.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        let entityInfo = null;
        
        if (activity.entityType === "patient" && activity.entityId) {
          entityInfo = await storage.getPatient(activity.entityId);
        } else if (activity.entityType === "scan" && activity.entityId) {
          entityInfo = await storage.getScan(activity.entityId);
        } else if (activity.entityType === "treatment_plan" && activity.entityId) {
          entityInfo = await storage.getTreatmentPlan(activity.entityId);
        }
        
        return {
          ...activity,
          user: user ? { id: user.id, fullName: user.fullName } : null,
          entityInfo,
        };
      }));
      
      res.json(enrichedActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities", error });
    }
  });

  // Stats and dashboard data
  app.get("/api/dashboard/stats", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const patients = await storage.getPatientsByClinic(user.clinicId);
      const scans = await storage.getScansByUser(user.id);
      const treatmentPlans = await storage.getAllTreatmentPlans();
      
      // Calculate statistics
      const stats = {
        totalPatients: patients.length,
        totalScans: scans.length,
        tokensUsed: user.tokens, // Mock value since we don't have real token usage
        treatmentPlans: treatmentPlans.length,
        completionRate: 94, // Mock value for demo
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats", error });
    }
  });

  // Helper function to simulate AI analysis results
  function simulateAIAnalysis() {
    return {
      findings: [
        {
          type: "cavity",
          location: "upper molars",
          teeth: ["16", "17"],
          priority: "high",
          confidence: 98,
          description: "2 cavities detected in upper molars (teeth #16, #17)",
        },
        {
          type: "enamel_wear",
          location: "lower incisors",
          priority: "medium",
          confidence: 85,
          description: "Moderate wear detected on lower incisors",
        },
        {
          type: "restoration",
          location: "tooth #30",
          priority: "low",
          confidence: 99,
          description: "Existing filling on tooth #30 in good condition",
        },
      ],
      recommendations: [
        {
          procedure: "filling",
          teeth: ["16", "17"],
          urgency: "high",
          notes: "Composite fillings recommended for both cavities",
        },
        {
          procedure: "fluoride_treatment",
          urgency: "medium",
          notes: "To address enamel wear on lower incisors",
        },
        {
          procedure: "monitoring",
          teeth: ["30"],
          urgency: "low",
          notes: "Continue monitoring existing restoration on follow-up visits",
        },
      ],
      overallHealth: "fair",
      summary: "Patient requires attention for cavities in upper molars and enamel wear on lower incisors. Existing restoration is in good condition."
    };
  }

  // API Key routes for enterprise clients
  app.get("/api/api-keys", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const apiKeys = await storage.getApiKeysByUser(user.id);
      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys", error });
    }
  });

  app.post("/api/api-keys", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can create API keys" });
      }

      const validatedData = insertApiKeySchema.parse(req.body);
      
      // Generate a secure random string for the secret
      const cryptoSecret = crypto.randomBytes(32).toString('hex');
      
      const apiKey = await storage.createApiKey({
        ...validatedData,
        userId: user.id,
        secret: cryptoSecret
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "api_key_created",
        description: `New API key created: ${apiKey.name}`,
        entityType: "api_key",
        entityId: apiKey.id
      });

      res.status(201).json(apiKey);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.delete("/api/api-keys/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      
      const apiKey = await storage.getApiKey(id);
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      // Only the creator or an admin can deactivate an API key
      if (apiKey.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to deactivate this API key" });
      }
      
      const deactivatedKey = await storage.deactivateApiKey(id);
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "api_key_deactivated",
        description: `API key deactivated: ${apiKey.name}`,
        entityType: "api_key",
        entityId: apiKey.id
      });

      res.json(deactivatedKey);
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate API key", error });
    }
  });

  // Subscription routes
  app.get("/api/subscriptions", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const subscription = await storage.getSubscriptionByClinic(user.clinicId);
      res.json(subscription || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription", error });
    }
  });

  app.post("/api/subscriptions", ensureAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if clinic already has a subscription
      const existingSubscription = await storage.getSubscriptionByClinic(user.clinicId);
      if (existingSubscription) {
        return res.status(400).json({ 
          message: "Clinic already has an active subscription. Please update the existing subscription instead." 
        });
      }
      
      const validatedData = insertSubscriptionSchema.parse(req.body);
      
      const subscription = await storage.createSubscription({
        ...validatedData,
        clinicId: user.clinicId,
        startDate: new Date()
      });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "subscription_created",
        description: `New subscription created: ${subscription.planType}`,
        entityType: "subscription",
        entityId: subscription.id
      });

      res.status(201).json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  app.put("/api/subscriptions/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      
      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Make sure the subscription belongs to user's clinic
      if (subscription.clinicId !== user.clinicId) {
        return res.status(403).json({ message: "Unauthorized to modify this subscription" });
      }
      
      const updatedSubscription = await storage.updateSubscription(id, req.body);
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "subscription_updated",
        description: `Subscription updated: ${subscription.planType}`,
        entityType: "subscription",
        entityId: subscription.id
      });

      res.json(updatedSubscription);
    } catch (error) {
      res.status(400).json({ message: "Failed to update subscription", error });
    }
  });

  // Wallet routes for pay-per-use model
  app.get("/api/wallet", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let wallet = await storage.getWalletByUser(user.id);
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await storage.createWallet({ userId: user.id });
      }
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet", error });
    }
  });

  app.post("/api/wallet/deposit", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { amount, paymentMethod, paymentReference } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const depositAmount = parseFloat(amount);
      const updatedWallet = await storage.addFundsToWallet(user.id, depositAmount);
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: user.id,
        amount: depositAmount.toString(),
        type: "deposit",
        status: "completed",
        paymentMethod,
        paymentReference,
        description: `Wallet deposit of ${depositAmount}`
      });
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "wallet_deposit",
        description: `Wallet deposit: ${depositAmount}`,
        entityType: "transaction",
        entityId: transaction.id
      });

      res.json({ wallet: updatedWallet, transaction });
    } catch (error) {
      res.status(400).json({ message: "Failed to add funds to wallet", error });
    }
  });

  app.post("/api/services/purchase", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { serviceType, amount } = req.body;
      
      if (!Object.values(SERVICE_TYPES).includes(serviceType)) {
        return res.status(400).json({ message: "Invalid service type" });
      }
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const serviceAmount = parseFloat(amount);
      
      // Deduct funds from wallet
      const updatedWallet = await storage.deductFundsFromWallet(user.id, serviceAmount, serviceType);
      if (!updatedWallet) {
        return res.status(400).json({ message: "Insufficient funds in wallet" });
      }

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "service_purchase",
        description: `Service purchased: ${serviceType} for ${serviceAmount}`,
        entityType: "wallet",
        entityId: updatedWallet.id
      });

      res.json({ wallet: updatedWallet, success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to purchase service", error });
    }
  });

  // Transaction history
  app.get("/api/transactions", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const transactions = await storage.getTransactionsByUser(user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions", error });
    }
  });

  // Google authentication routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get(
      "/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login" }),
      (req: Request, res: Response) => {
        res.redirect("/");
      }
    );

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: "/auth/google/callback",
        },
        async (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
          try {
            // ... rest of the existing code ...
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
  }

  app.delete("/api/scans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Check if scan exists
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Delete the scan
      await storage.deleteScan(scanId);

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "scan_deleted",
        description: `Scan ${scan.fileName} deleted`,
        entityType: "scan",
        entityId: scanId
      });

      res.json({ message: "Scan deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scan", error });
    }
  });

  app.post("/api/scans/:id/report", ensureAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const user = req.user as any;

      // Check if scan exists and has been analyzed
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      if (scan.status !== "completed") {
        return res.status(400).json({ 
          message: "Cannot generate report. Scan analysis must be completed first." 
        });
      }

      // Get the analysis results
      const analysis = await storage.getAnalysisByScan(scanId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found for this scan" });
      }

      // Get patient information
      const patient = await storage.getPatient(scan.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Generate report
      const report = {
        id: crypto.randomUUID(),
        scanId,
        patientId: patient.id,
        patientName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        scanDate: scan.uploadedAt,
        generatedAt: new Date(),
        generatedBy: user.id,
        findings: analysis.results.findings,
        recommendations: analysis.results.recommendations,
        overallHealth: analysis.results.overallHealth,
        summary: analysis.results.summary,
        confidence: analysis.confidence,
        dentistNotes: req.body.dentistNotes || ""
      };

      // Save the report
      const savedReport = await storage.createReport(report);

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "report_generated",
        description: `Report generated for scan ${scan.fileName}`,
        entityType: "report",
        entityId: savedReport.id
      });

      res.status(201).json(savedReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report", error });
    }
  });

  // Get reports for a scan
  app.get("/api/scans/:id/reports", ensureAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const reports = await storage.getReportsByScan(scanId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
