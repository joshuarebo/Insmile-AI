import { 
  User, InsertUser, 
  Clinic, InsertClinic, 
  Patient, InsertPatient, 
  Scan, InsertScan, 
  Analysis, InsertAnalysis, 
  TreatmentPlan, InsertTreatmentPlan,
  Activity, InsertActivity,
  Subscription, InsertSubscription,
  ApiKey, InsertApiKey,
  Transaction, InsertTransaction,
  Wallet, InsertWallet
} from "@shared/schema";
import crypto from 'crypto';

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUsersByClinic(clinicId: number): Promise<User[]>;

  // Clinic operations
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, data: Partial<Clinic>): Promise<Clinic | undefined>;
  getAllClinics(): Promise<Clinic[]>;

  // Patient operations
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, data: Partial<Patient>): Promise<Patient | undefined>;
  getPatientsByClinic(clinicId: number): Promise<Patient[]>;
  getAllPatients(): Promise<Patient[]>;

  // Scan operations
  getScan(id: number): Promise<Scan | undefined>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: number, data: Partial<Scan>): Promise<Scan | undefined>;
  getScansByPatient(patientId: number): Promise<Scan[]>;
  getScansByUser(userId: number): Promise<Scan[]>;
  deleteScan(id: number): Promise<void>;

  // Analysis operations
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysisByScan(scanId: number): Promise<Analysis | undefined>;
  getAnalysesByPatient(patientId: number): Promise<Analysis[]>;

  // Treatment plan operations
  getTreatmentPlan(id: number): Promise<TreatmentPlan | undefined>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;
  updateTreatmentPlan(id: number, data: Partial<TreatmentPlan>): Promise<TreatmentPlan | undefined>;
  getTreatmentPlansByPatient(patientId: number): Promise<TreatmentPlan[]>;
  getAllTreatmentPlans(): Promise<TreatmentPlan[]>;

  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  getActivitiesByPatient(patientId: number): Promise<Activity[]>;
  
  // Subscription operations
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByClinic(clinicId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined>;
  
  // API Key operations
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined>;
  getApiKeysByUser(userId: number): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deactivateApiKey(id: number): Promise<ApiKey | undefined>;
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  
  // Wallet operations
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletByUser(userId: number): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, data: Partial<Wallet>): Promise<Wallet | undefined>;
  addFundsToWallet(userId: number, amount: number): Promise<Wallet | undefined>;
  deductFundsFromWallet(userId: number, amount: number, serviceType: string): Promise<Wallet | undefined>;

  // Report operations
  createReport(report: Report): Promise<Report>;
  getReport(id: string): Promise<Report | undefined>;
  getReportsByScan(scanId: number): Promise<Report[]>;
  getReportsByPatient(patientId: number): Promise<Report[]>;
}

export interface Report {
  id: string;
  scanId: number;
  patientId: number;
  patientName: string;
  dateOfBirth: string;
  scanDate: Date | null;
  generatedAt: Date;
  generatedBy: number;
  findings: any[];
  recommendations: any[];
  overallHealth: string;
  summary: string;
  confidence: number;
  dentistNotes: string;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clinics: Map<number, Clinic>;
  private patients: Map<number, Patient>;
  private scans: Map<number, Scan>;
  private analyses: Map<number, Analysis>;
  private treatmentPlans: Map<number, TreatmentPlan>;
  private activities: Map<number, Activity>;
  private subscriptions: Map<number, Subscription>;
  private apiKeys: Map<number, ApiKey>;
  private transactions: Map<number, Transaction>;
  private wallets: Map<number, Wallet>;
  private reports: Map<string, Report>;

  private userId = 1;
  private clinicId = 1;
  private patientId = 1;
  private scanId = 1;
  private analysisId = 1;
  private treatmentPlanId = 1;
  private activityId = 1;
  private subscriptionId = 1;
  private apiKeyId = 1;
  private transactionId = 1;
  private walletId = 1;

  constructor() {
    this.users = new Map();
    this.clinics = new Map();
    this.patients = new Map();
    this.scans = new Map();
    this.analyses = new Map();
    this.treatmentPlans = new Map();
    this.activities = new Map();
    this.subscriptions = new Map();
    this.apiKeys = new Map();
    this.transactions = new Map();
    this.wallets = new Map();
    this.reports = new Map();

    this.initializeData();
  }

  private initializeData() {
    // Create a test clinic
    const clinic: Clinic = {
      id: this.clinicId,
      name: "InSmile AI Dental Clinic",
      address: "123 Dental Street",
      phone: "+1234567890",
      createdAt: new Date()
    };
    this.clinics.set(this.clinicId, clinic);

    // Hash passwords
    const hashPassword = (password: string) => {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      return `${salt}:${hash}`;
    };

    // Create admin user
    const adminUser: User = {
      id: this.userId++,
      username: "admin",
      password: hashPassword("admin123"),
      email: "admin@insmile.ai",
      fullName: "Admin User",
      role: "admin",
      clinicId: this.clinicId,
      tokens: 1000,
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create dentist user
    const dentistUser: User = {
      id: this.userId++,
      username: "dentist",
      password: hashPassword("dentist123"),
      email: "dentist@insmile.ai",
      fullName: "Test Dentist",
      role: "dentist",
      clinicId: this.clinicId,
      tokens: 1000,
      createdAt: new Date()
    };
    this.users.set(dentistUser.id, dentistUser);

    // Create a test patient
    const patient: Patient = {
      id: this.patientId,
      patientId: "P001",
      fullName: "Alice Johnson",
      email: "alice@example.com",
      dateOfBirth: new Date("1990-01-01"),
      gender: "female",
      phone: "+1234567891",
      address: "456 Patient Ave",
      medicalHistory: "No significant medical history",
      clinicId: this.clinicId,
      createdAt: new Date(),
      status: "active",
      emergencyContact: null,
      allergies: null,
      currentMedications: null,
      insuranceInfo: null,
      communicationPreferences: null,
      lastVisit: null,
      nextAppointment: null,
      nextSteps: null,
      riskLevel: "medium",
      lastUpdated: null,
      updatedBy: null,
      assignedDentist: null,
      notes: null
    };
    this.patients.set(this.patientId++, patient);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      fullName: insertUser.fullName,
      role: insertUser.role || "dentist",
      clinicId: insertUser.clinicId || null,
      tokens: 1000,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByClinic(clinicId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.clinicId === clinicId,
    );
  }

  // Clinic methods
  async getClinic(id: number): Promise<Clinic | undefined> {
    return this.clinics.get(id);
  }

  async createClinic(insertClinic: InsertClinic): Promise<Clinic> {
    const id = this.clinicId++;
    const clinic: Clinic = { ...insertClinic, id, createdAt: new Date() };
    this.clinics.set(id, clinic);
    return clinic;
  }

  async updateClinic(id: number, data: Partial<Clinic>): Promise<Clinic | undefined> {
    const clinic = this.clinics.get(id);
    if (!clinic) return undefined;
    
    const updatedClinic = { ...clinic, ...data };
    this.clinics.set(id, updatedClinic);
    return updatedClinic;
  }

  async getAllClinics(): Promise<Clinic[]> {
    return Array.from(this.clinics.values());
  }

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find(
      (patient) => patient.patientId === patientId,
    );
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.patientId++;
    const patient: Patient = { 
      ...insertPatient, 
      id,
      createdAt: new Date()
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: number, data: Partial<Patient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updatedPatient = { ...patient, ...data };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  async getPatientsByClinic(clinicId: number): Promise<Patient[]> {
    return Array.from(this.patients.values())
      .filter((patient) => patient.clinicId === clinicId)
      .sort((a, b) => (b.lastVisit?.getTime() || 0) - (a.lastVisit?.getTime() || 0));
  }

  async getAllPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values())
      .sort((a, b) => (b.lastVisit?.getTime() || 0) - (a.lastVisit?.getTime() || 0));
  }

  // Scan methods
  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = this.scanId++;
    const scan: Scan = {
      ...insertScan,
      id,
      status: "pending",
      tokensUsed: 0,
      uploadedAt: new Date(),
    };
    this.scans.set(id, scan);
    return scan;
  }

  async updateScan(id: number, data: Partial<Scan>): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (!scan) return undefined;
    
    const updatedScan = { ...scan, ...data };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }

  async getScansByPatient(patientId: number): Promise<Scan[]> {
    return Array.from(this.scans.values())
      .filter((scan) => scan.patientId === patientId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async getScansByUser(userId: number): Promise<Scan[]> {
    return Array.from(this.scans.values())
      .filter((scan) => scan.uploadedBy === userId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteScan(id: number): Promise<void> {
    this.scans.delete(id);
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = this.analysisId++;
    const analysis: Analysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysisByScan(scanId: number): Promise<Analysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.scanId === scanId,
    );
  }

  async getAnalysesByPatient(patientId: number): Promise<Analysis[]> {
    // Get all scans for the patient
    const patientScans = await this.getScansByPatient(patientId);
    const scanIds = patientScans.map(scan => scan.id);
    
    // Get analyses for those scans
    return Array.from(this.analyses.values())
      .filter(analysis => scanIds.includes(analysis.scanId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Treatment plan methods
  async getTreatmentPlan(id: number): Promise<TreatmentPlan | undefined> {
    return this.treatmentPlans.get(id);
  }

  async createTreatmentPlan(insertPlan: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const id = this.treatmentPlanId++;
    const plan: TreatmentPlan = {
      ...insertPlan,
      id,
      completionRate: 0,
      createdAt: new Date(),
    };
    this.treatmentPlans.set(id, plan);
    return plan;
  }

  async updateTreatmentPlan(id: number, data: Partial<TreatmentPlan>): Promise<TreatmentPlan | undefined> {
    const plan = this.treatmentPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...data };
    this.treatmentPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async getTreatmentPlansByPatient(patientId: number): Promise<TreatmentPlan[]> {
    return Array.from(this.treatmentPlans.values())
      .filter((plan) => plan.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllTreatmentPlans(): Promise<TreatmentPlan[]> {
    return Array.from(this.treatmentPlans.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityId++;
    const activity: Activity = { ...insertActivity, id, createdAt: new Date() };
    this.activities.set(id, activity);
    return activity;
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((activity) => activity.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActivitiesByPatient(patientId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((activity) => activity.entityType === "patient" && activity.entityId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Subscription methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getSubscriptionByClinic(clinicId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.clinicId === clinicId
    );
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      status: "active",
      tokenBalance: insertSubscription.tokenAllowance,
      createdAt: new Date()
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updatedSubscription = { ...subscription, ...data };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  // API Key methods
  async getApiKey(id: number): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }

  async getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(
      (key) => key.apiKey.toString() === apiKey
    );
  }

  async getApiKeysByUser(userId: number): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter((key) => key.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = this.apiKeyId++;
    // Generate UUID for API key
    const apiKeyUuid = crypto.randomUUID();
    const apiKey: ApiKey = {
      ...insertApiKey,
      id,
      apiKey: apiKeyUuid,
      isActive: true,
      tokenUsage: 0,
      createdAt: new Date()
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;
    
    const updatedApiKey = { ...apiKey, ...data };
    this.apiKeys.set(id, updatedApiKey);
    return updatedApiKey;
  }

  async deactivateApiKey(id: number): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;
    
    const deactivatedApiKey = { ...apiKey, isActive: false };
    this.apiKeys.set(id, deactivatedApiKey);
    return deactivatedApiKey;
  }

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: new Date()
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Wallet methods
  async getWallet(id: number): Promise<Wallet | undefined> {
    return this.wallets.get(id);
  }

  async getWalletByUser(userId: number): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(
      (wallet) => wallet.userId === userId
    );
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const id = this.walletId++;
    const wallet: Wallet = {
      ...insertWallet,
      id,
      balance: "0",
      totalDeposited: "0",
      totalSpent: "0",
      createdAt: new Date()
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  async updateWallet(id: number, data: Partial<Wallet>): Promise<Wallet | undefined> {
    const wallet = this.wallets.get(id);
    if (!wallet) return undefined;
    
    const updatedWallet = { ...wallet, ...data };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  async addFundsToWallet(userId: number, amount: number): Promise<Wallet | undefined> {
    // Find the user's wallet or create one if it doesn't exist
    let wallet = await this.getWalletByUser(userId);
    if (!wallet) {
      wallet = await this.createWallet({ userId });
    }
    
    // Update the wallet
    const currentBalance = parseFloat(wallet.balance);
    const currentDeposited = parseFloat(wallet.totalDeposited);
    
    const updatedWallet: Wallet = {
      ...wallet,
      balance: (currentBalance + amount).toString(),
      totalDeposited: (currentDeposited + amount).toString(),
      lastDeposit: new Date()
    };
    
    this.wallets.set(updatedWallet.id, updatedWallet);
    
    // Create a transaction record
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "deposit",
      status: "completed",
      tokensAffected: 0,
      description: "Wallet deposit"
    });
    
    return updatedWallet;
  }

  async deductFundsFromWallet(userId: number, amount: number, serviceType: string): Promise<Wallet | undefined> {
    // Find the user's wallet
    const wallet = await this.getWalletByUser(userId);
    if (!wallet) return undefined;
    
    // Check if wallet has enough funds
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < amount) return undefined;
    
    // Update the wallet
    const currentSpent = parseFloat(wallet.totalSpent);
    
    const updatedWallet: Wallet = {
      ...wallet,
      balance: (currentBalance - amount).toString(),
      totalSpent: (currentSpent + amount).toString()
    };
    
    this.wallets.set(updatedWallet.id, updatedWallet);
    
    // Create a transaction record
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "service_fee",
      status: "completed",
      tokensAffected: -Math.floor(amount), // Rough estimate of tokens used
      serviceType,
      description: `Payment for ${serviceType} service`
    });
    
    return updatedWallet;
  }

  // Report methods
  async createReport(report: Report): Promise<Report> {
    this.reports.set(report.id, report);
    return report;
  }

  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getReportsByScan(scanId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(report => report.scanId === scanId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async getReportsByPatient(patientId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(report => report.patientId === patientId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }
}

// Export the storage instance
export const storage = new MemStorage();
