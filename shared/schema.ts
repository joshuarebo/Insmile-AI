import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription plan types
export const SUBSCRIPTION_TYPES = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
  API_STANDARD: 'api_standard',
  API_PREMIUM: 'api_premium',
  API_ENTERPRISE: 'api_enterprise',
  PAY_PER_USE: 'pay_per_use'
};

// Service types for pay-per-use
export const SERVICE_TYPES = {
  CBCT_XRAY_ANALYSIS: 'cbct_xray_analysis',
  TREATMENT_PLANNING: 'treatment_planning',
  PATIENT_REPORT: 'patient_report'
};

// User model with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("dentist"), // admin, dentist, patient
  clinicId: integer("clinic_id"),
  tokens: integer("tokens").default(1000), // Available AI tokens for the user
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinic model
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient model with unique identifiers
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(), // Unique patient identifier (e.g., PAT-10021)
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  medicalHistory: jsonb("medical_history"), // Store medical history as JSON
  allergies: jsonb("allergies"), // Store allergies as JSON array
  currentMedications: jsonb("current_medications"), // Store medications as JSON array
  status: text("status").default("active"), // active, scheduled, follow-up, etc.
  clinicId: integer("clinic_id").notNull(),
  assignedDentist: integer("assigned_dentist"), // Reference to users table
  insuranceInfo: jsonb("insurance_info"), // Store insurance details as JSON
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  lastVisit: timestamp("last_visit"),
  nextAppointment: timestamp("next_appointment"),
  nextSteps: text("next_steps"),
  riskLevel: text("risk_level").default("medium"), // low, medium, high
  communicationPreferences: jsonb("communication_preferences"), // Store preferences as JSON
  lastUpdated: timestamp("last_updated"),
  updatedBy: integer("updated_by"), // Reference to users table
});

// Scan model for uploaded dental images
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(), // User ID
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // CBCT, X-ray, etc.
  fileUrl: text("file_url").notNull(), // Azure Blob Storage URL
  status: text("status").default("pending"), // pending, analyzing, completed
  tokensUsed: integer("tokens_used"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// AI Analysis results
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull(),
  results: jsonb("results").notNull(), // JSON with AI findings
  confidence: integer("confidence"), // Confidence score (0-100)
  tokensUsed: integer("tokens_used").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Treatment plans
export const treatmentPlans = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  analysisId: integer("analysis_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("draft"), // draft, active, completed
  createdBy: integer("created_by").notNull(), // User ID
  createdAt: timestamp("created_at").defaultNow(),
  steps: jsonb("steps"), // JSON array of treatment steps
  completionRate: integer("completion_rate").default(0), // 0-100%
});

// Activities for the activity log
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type"), // patient, scan, treatment, etc.
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription plans for clinics
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  planType: text("plan_type").notNull(), // basic, pro, enterprise, api_standard, api_premium, api_enterprise, pay_per_use
  status: text("status").notNull().default("active"), // active, expired, canceled
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  tokenAllowance: integer("token_allowance").notNull(), // Total monthly tokens
  tokenBalance: integer("token_balance").notNull(), // Current remaining tokens
  additionalTokenRate: numeric("additional_token_rate"), // Cost per token in KES if exceeding allowance
  price: numeric("price").notNull(), // Subscription price in KES
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly, annual
  autoRenew: boolean("auto_renew").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Keys for enterprise clients
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  apiKey: uuid("api_key").notNull().defaultRandom(),
  name: text("name").notNull(), // Description/purpose of the key
  secret: text("secret").notNull(), // Secret for authentication
  isActive: boolean("is_active").notNull().default(true),
  permissions: jsonb("permissions").notNull(), // Array of permissions
  lastUsed: timestamp("last_used"),
  tokenUsage: integer("token_usage").notNull().default(0), // Total tokens used with this key
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When null, does not expire
});

// Transaction history (for purchases, usage, etc.)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"),
  amount: numeric("amount").notNull(), // Amount in KES
  type: text("type").notNull(), // deposit, service_fee, refund, token_purchase
  status: text("status").notNull(), // completed, pending, failed
  tokensAffected: integer("tokens_affected"), // Positive for purchases, negative for consumption
  serviceType: text("service_type"), // For pay-per-use: cbct_xray_analysis, treatment_planning, patient_report
  paymentMethod: text("payment_method"), // mpesa, stripe, paypal
  paymentReference: text("payment_reference"), // External transaction ID
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wallet for pay-per-use dentists
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: numeric("balance").notNull().default("0"), // Amount in KES
  lastDeposit: timestamp("last_deposit"),
  totalDeposited: numeric("total_deposited").notNull().default("0"),
  totalSpent: numeric("total_spent").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  tokens: true,
});

export const insertClinicSchema = createInsertSchema(clinics).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  lastVisit: true,
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true, 
  uploadedAt: true,
  tokensUsed: true,
  status: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({
  id: true,
  createdAt: true,
  completionRate: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  status: true,
  tokenBalance: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  apiKey: true,
  isActive: true,
  lastUsed: true,
  tokenUsage: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  balance: true,
  lastDeposit: true,
  totalDeposited: true,
  totalSpent: true,
  createdAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Clinic = typeof clinics.$inferSelect;
export type InsertClinic = z.infer<typeof insertClinicSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Scan = typeof scans.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// Authentication schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
