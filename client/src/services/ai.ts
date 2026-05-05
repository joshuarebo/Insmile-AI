import axios from 'axios';
import { supabase } from '../lib/supabase';

export const API_BASE_URL =
  (process.env.REACT_APP_API_URL as string | undefined) || 'http://localhost:3001/api';

axios.defaults.timeout = 60000;

// Inject auth token into every request
axios.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export interface Finding {
  label: string;
  tooth?: string | null;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  bbox_norm?: [number, number, number, number];
}

export interface AnalysisResult {
  findings: Finding[];
  overall: string;
  confidence: number;
  recommendations: string[];
  image_quality?: string;
  model?: string;
  provider?: string;
}

export interface TreatmentStep {
  step: string;
  description: string;
  timeframe: string;
  visits?: number;
  sha_covered?: boolean;
  cost_kes?: {
    public?: string;
    private_mid?: string;
    private_premium?: string;
  };
}

export interface TreatmentPlan {
  overview: string;
  urgency?: 'routine' | 'soon' | 'urgent';
  steps: TreatmentStep[];
  precautions?: string[];
  alternatives?: string[];
  home_care?: string[];
  referral?: string | null;
  total_cost_kes?: {
    public?: string;
    private_mid?: string;
    private_premium?: string;
  };
  estimated_duration?: string;
  patientId?: string | null;
  scanId?: string | null;
  model?: string;
  provider?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface UploadResponse {
  success: boolean;
  scanId: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  aiAvailable: boolean;
  realTimeAvailable: boolean;
  provider?: string;
  models?: { text?: string; vision?: string };
}

function url(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function getHealth(): Promise<HealthStatus | null> {
  try {
    const { data } = await axios.get(url('/health'), { timeout: 4000 });
    return data;
  } catch {
    return null;
  }
}

export async function uploadScan(
  file: File,
  patientId: string,
  scanType = 'xray'
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append('scan', file);
  fd.append('patientId', patientId);
  fd.append('scanType', scanType);
  const { data } = await axios.post(url('/ai/upload-scan'), fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function getAnalysisStatus(scanId: string) {
  const { data } = await axios.get(url(`/ai/analysis/${scanId}/status`));
  return data as { status: string; progress?: number; error?: string };
}

export async function getAnalysis(scanId: string): Promise<AnalysisResult | null> {
  try {
    const { data } = await axios.get(url(`/ai/analysis/${scanId}`));
    return data as AnalysisResult;
  } catch {
    return null;
  }
}

export async function pollForAnalysis(
  scanId: string,
  onProgress?: (pct: number) => void,
  { intervalMs = 2000, timeoutMs = 180000 } = {}
): Promise<AnalysisResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getAnalysisStatus(scanId);
    if (onProgress) onProgress(status.progress || 0);
    if (status.status === 'completed') {
      const result = await getAnalysis(scanId);
      if (result) return result;
    }
    if (status.status === 'failed') {
      throw new Error(status.error || 'Analysis failed');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Analysis timed out');
}

export async function generateTreatmentPlan(
  patientId: string,
  scanId?: string,
  pricingMode: 'public' | 'private_mid' | 'private_premium' = 'private_mid'
): Promise<TreatmentPlan> {
  const { data } = await axios.post(url('/ai/treatment-plan'), {
    patientId,
    scanId,
    pricingMode,
  });
  return data as TreatmentPlan;
}

export async function sendChatMessage(
  message: string,
  patientId: string,
  history: ChatMessage[] = []
): Promise<{ message: string; model?: string }> {
  const { data } = await axios.post(url('/ai/chat'), {
    message,
    patientId,
    chatHistory: history,
  });
  return { message: data.message, model: data.model };
}

export function scanImageUrl(scanId: string) {
  return `${API_BASE_URL}/scans/${scanId}/image`;
}
