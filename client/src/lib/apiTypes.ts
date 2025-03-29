import { User, Patient, Scan, Analysis, TreatmentPlan, Activity } from "@shared/schema";

export interface ActivityWithDetails extends Activity {
  user?: {
    id: number;
    fullName: string;
  };
  entityInfo?: any;
}

export interface DashboardStats {
  totalPatients: number;
  totalScans: number;
  tokensUsed: number;
  treatmentPlans: number;
  completionRate: number;
}

export interface PatientListResponse {
  patients: Patient[];
  totalCount: number;
}

export interface AIAnalysisResult {
  analysis: Analysis;
  tokensUsed: number;
  userTokensRemaining: number;
}

export interface AnalysisFinding {
  type: string;
  location: string;
  teeth?: string[];
  priority: string;
  confidence: number;
  description: string;
}

export interface AnalysisRecommendation {
  procedure: string;
  teeth?: string[];
  urgency: string;
  notes: string;
}

export interface AIResults {
  findings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  overallHealth: string;
  summary: string;
}
