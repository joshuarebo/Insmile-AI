export interface Patient {
  id: number;
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'pending' | 'inactive';
  riskLevel: 'low' | 'medium' | 'high';
  lastVisit: string | null;
  nextSteps: string | null;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  } | null;
  medicalHistory: {
    conditions: Array<{
      name: string;
      notes: string;
      diagnosedDate?: string;
    }>;
    lastUpdated: string;
  } | null;
  allergies: string[] | null;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
  }> | null;
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    expirationDate?: string;
  } | null;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    preferredLanguage: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: number;
  patientId: number;
  fileName: string;
  fileType: string;
  fileUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tokensUsed?: number;
  analysis?: {
    findings: string[];
    recommendations: string[];
    aiConfidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ... rest of existing types ... 