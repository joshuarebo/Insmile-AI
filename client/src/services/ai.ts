import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/ai';

// Set default timeout to 10 seconds
axios.defaults.timeout = 10000;

// Add response interceptor for debugging
axios.interceptors.response.use(
  response => {
    console.log(`API Response [${response.config.method}] ${response.config.url}:`, 
      response.status, 
      response.data ? (typeof response.data === 'object' ? 'data object' : 'data received') : 'no data');
    return response;
  },
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('API Request Timeout:', error.config.url);
    } else {
      console.error('API Error:', error.response ? {
        url: error.config.url,
        status: error.response.status,
        message: error.message,
        data: error.response.data
      } : error.message);
    }
    return Promise.reject(error);
  }
);

// Add request interceptor for debugging
axios.interceptors.request.use(
  config => {
    console.log(`API Request [${config.method}] ${config.url}`);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Check if API is available
let isApiAvailable = false; // Start with false until confirmed
let serverAiConfig = {
  forceRealApi: false,
  allowMockFallback: true,
  debugMode: false
};

const checkApiAvailability = async (): Promise<boolean> => {
  try {
    console.log('Checking API availability...');
    const response = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
    console.log('API health check response:', response.data);
    
    // Update server AI config if available
    if (response.data && response.data.aiConfig) {
      serverAiConfig = response.data.aiConfig;
      console.log('Server AI config:', serverAiConfig);
      
      // If server forces real API, adjust our settings
      if (serverAiConfig.forceRealApi) {
        ai.forceRealMode = true;
        console.log('Server has forceRealApi enabled, setting forceRealMode=true');
      }
    }
    
    isApiAvailable = true;
    console.log('API is available');
    return true;
  } catch (err) {
    console.log('API health check failed:', err);
    isApiAvailable = false;
    console.log('API is not available, using mock responses');
    return false;
  }
};

// Run initial check
checkApiAvailability();

// Set up periodic check every 30 seconds
setInterval(checkApiAvailability, 30000);

export interface AnalysisResult {
  findings: Array<{
    label: string;
    confidence: number;
    severity: 'normal' | 'mild' | 'severe';
    bbox?: [number, number, number, number];
  }>;
  overall: string;
  confidence: number;
  processingTime: number;
}

export interface TreatmentStep {
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  estimatedCost: string;
  prerequisites: string[];
}

export interface TreatmentPlan {
  summary: string;
  diagnosis: string;
  steps: TreatmentStep[];
  totalEstimatedTime: string;
  totalEstimatedCost: string;
  precautions: string[];
  alternatives: string[];
}

export interface ChatResponse {
  message: string;
  intent?: string;
  slots?: Record<string, string>;
  followUpQuestions?: string[];
}

export interface UploadScanResponse {
  success: boolean;
  message: string;
  scanId: string;
}

export const ai = {
  // For components to check if API is available (synchronous version)
  isAvailable: () => isApiAvailable,
  
  // Force real API mode - set to true to disable demo mode fallbacks
  forceRealMode: true,
  
  // Get server AI config
  getServerConfig: () => serverAiConfig,
  
  // Check if real-time analysis is available
  isRealTimeAvailable: async (): Promise<boolean> => {
    if (!isApiAvailable) {
      return false;
    }
    
    try {
      // First check with simple health endpoint if it has AI config
      if (serverAiConfig.forceRealApi === true) {
        // Try debug-test to verify Bedrock specifically
        try {
          const response = await axios.get(`${API_BASE_URL}/debug-test`, { timeout: 8000 });
          console.log('Raw debug-test response:', response.data);
          
          // Check if testPassed property is true
          const bedrockAvailable = response.data && response.data.testPassed === true;
          console.log(`Bedrock availability check result: ${bedrockAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
          
          if (!bedrockAvailable && response.data?.error) {
            console.warn('Bedrock test failed:', response.data.error);
          }
          
          return bedrockAvailable;
        } catch (testError) {
          console.error('Error in debug-test:', testError);
          // If we know the server is forcing real API and it fails, that means we have
          // a configuration issue with AWS
          return false;
        }
      } else {
        // Fall back to the older test endpoint
        const response = await axios.get(`${API_BASE_URL}/test`, { timeout: 5000 });
        return response.data && response.data.bedrockAvailable === true;
      }
    } catch (error) {
      console.error('Error checking real-time availability:', error);
      return false;
    }
  },
  
  // Helper to check if an ID is in demo format
  isDemoId: (id: string): boolean => {
    // If forceRealMode is true, don't treat any ID as demo
    if (ai.forceRealMode) {
      return false;
    }
    return id?.startsWith('demo') === true;
  },

  async analyzeImage(scanId: string, patientId: string) {
    // Allow demo IDs to bypass API check
    if (ai.isDemoId(scanId) || ai.isDemoId(patientId)) {
      console.log('Demo ID detected, skipping API call');
      return { success: true, status: 'demo' };
    }
    
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      console.log(`Initiating analysis for scan ${scanId} (patient ${patientId})`);
      const response = await axios.post(`${API_BASE_URL}/analyze/${scanId}`, {
        patientId
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  },

  async getAnalysis(scanId: string) {
    // Allow demo IDs to bypass API check
    if (ai.isDemoId(scanId)) {
      console.log('Demo scan ID detected, returning mock analysis');
      return {
        findings: [
          { label: 'Cavity detected on tooth #14', confidence: 0.92, severity: 'severe' },
          { label: 'Early stage gum disease', confidence: 0.78, severity: 'mild' }
        ],
        overall: 'Dental health needs attention with several issues identified.',
        confidence: 0.88,
        processingTime: 1200
      };
    }
    
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/analysis/${scanId}`);
      
      // If we got a "processing" status, return null to continue polling
      if (response.data && response.data.status === 'processing') {
        console.log(`Analysis still processing: ${response.data.progress}% complete`);
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting analysis:', error);
      throw error;
    }
  },
  
  async getAnalysisStatus(scanId: string) {
    // Allow demo IDs to bypass API check
    if (ai.isDemoId(scanId)) {
      console.log('Demo scan ID detected, returning mock status');
      return { status: 'completed', progress: 100 };
    }
    
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/analysis/${scanId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting analysis status:', error);
      throw error;
    }
  },
  
  async getTreatmentPlan(patientId: string, scanId?: string) {
    // Allow demo IDs to bypass API check
    if (ai.isDemoId(patientId) || (scanId && ai.isDemoId(scanId))) {
      console.log('Demo ID detected, returning mock treatment plan');
      return {
        patientId: patientId || 'demo',
        overview: 'Treatment plan for multiple dental issues including cavities and early gum disease.',
        steps: [
          {
            step: 'Deep Cleaning',
            description: 'Professional cleaning to address gum disease and remove plaque buildup.',
            timeframe: '1-2 weeks'
          },
          {
            step: 'Cavity Filling',
            description: 'Treat cavity on tooth #14 with composite filling.',
            timeframe: '2-3 weeks'
          },
          {
            step: 'Follow-up Examination',
            description: 'Check healing progress and assess gum health.',
            timeframe: '6 weeks'
          }
        ],
        precautions: [
          'Avoid hard foods for 24 hours after filling',
          'Use prescribed mouthwash for gum disease'
        ],
        alternatives: [
          'Porcelain inlay instead of composite filling (higher cost)',
          'Surgical intervention for gum disease if non-surgical approach fails'
        ],
        estimatedDuration: '2-3 months',
        estimatedCost: '$800-1200',
        severity: 'medium'
      };
    }
    
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/treatment-plan`, {
        patientId,
        scanId
      });
      return response.data;
    } catch (error) {
      console.error('Error getting treatment plan:', error);
      throw error;
    }
  },
  
  async askQuestion(patientId: string, question: string, chatHistory?: any[]) {
    // Allow demo IDs to bypass API check
    if (ai.isDemoId(patientId)) {
      console.log('Demo patient ID detected, returning mock response');
      const mockResponses = [
        'Based on your dental scan, I recommend scheduling a cleaning appointment.',
        'Your cavity on tooth #14 should be treated within the next 2-3 weeks.',
        'Gum disease is at an early stage and can be managed with proper oral hygiene.',
        'I suggest using a soft-bristled toothbrush and fluoride toothpaste.',
        'Regular flossing will help with your gum health significantly.',
        'You should see improvements within 2 weeks of following the recommended treatment plan.',
        'Would you like me to explain the filling procedure in more detail?',
        'I recommend scheduling a follow-up appointment in 3 months.'
      ];
      return mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }
    
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      console.log('Sending chat message to real API:', question);
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        patientId,
        message: question,
        chatHistory: chatHistory || []
      });
      
      if (response.data && response.data.message) {
        return response.data.message;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  },

  // Get AI-generated recommendations based on findings
  async getRecommendations(scanId: string) {
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  },

  // Generate a comprehensive report
  async generateReport(scanId: string, patientId: string) {
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/report/${scanId}`, { patientId });
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
};

class AIService {
  // Scan Upload
  async uploadScan(file: File, patientId: string, scanType: string = 'dental'): Promise<UploadScanResponse> {
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      console.log(`Uploading scan for patient ${patientId}`);
      const formData = new FormData();
      formData.append('scan', file);
      formData.append('patientId', patientId);
      formData.append('scanType', scanType);
      
      const response = await axios.post(`${API_BASE_URL}/upload-scan`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading scan:', error);
      throw new Error('Failed to upload scan');
    }
  }

  // Additional AI Features
  async detectCaries(scanId: string): Promise<AnalysisResult> {
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/detect/caries/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Error detecting caries:', error);
      throw new Error('Failed to detect caries');
    }
  }

  async detectGumDisease(scanId: string): Promise<AnalysisResult> {
    if (!isApiAvailable) {
      throw new Error('API not available');
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/detect/gum-disease/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Error detecting gum disease:', error);
      throw new Error('Failed to detect gum disease');
    }
  }
}

export const aiService = new AIService(); 