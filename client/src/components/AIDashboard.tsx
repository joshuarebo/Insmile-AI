import React, { useEffect, useState } from 'react';
import { ai } from '../services/ai';

export default function AIDashboard() {
  const [apiConnected, setApiConnected] = useState(false);
  const [realTimeAvailable, setRealTimeAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check API status on component mount
    const checkStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First check if API server is available
        const isConnected = await Promise.resolve(ai.isAvailable());
        setApiConnected(isConnected);
        
        if (isConnected) {
          // Then check if real-time processing is available
          const isRealTime = await ai.isRealTimeAvailable();
          console.log('Real-time availability check result:', isRealTime);
          setRealTimeAvailable(isRealTime);
        }
      } catch (err) {
        console.error('Error checking AI status:', err);
        setError('Failed to check AI service status');
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Dental AI Dashboard</h2>
      
      {/* Status indicators */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">API {apiConnected ? 'connected' : 'disconnected'}</span>
        </div>
        
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${realTimeAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="font-medium">{realTimeAvailable ? 'Real-time mode' : 'Demo mode'}</span>
        </div>
      </div>
      
      {!realTimeAvailable && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="font-bold">Running in {ai.forceRealMode ? 'forced real API mode' : 'demo mode'}. </p>
          {!ai.forceRealMode && (
            <p>To enable real-time processing:</p>
          )}
          {(error || !apiConnected) && (
            <p className="text-red-500 mt-2">Error: API server not connected. Please make sure the server is running.</p>
          )}
          {apiConnected && !realTimeAvailable && !ai.forceRealMode && (
            <ul className="list-disc pl-5 mt-2">
              <li>Edit server/config/aws.json</li>
              <li>Add your AWS access key and secret key</li>
              <li>Restart the server</li>
            </ul>
          )}
          {apiConnected && !realTimeAvailable && ai.forceRealMode && (
            <p className="text-red-500 mt-2">
              Error: Real-time processing not available despite forced real mode. 
              Check your AWS credentials and ensure Bedrock services are enabled in your account.
            </p>
          )}
        </div>
      )}
      
      {/* Additional dashboard content can go here */}
    </div>
  );
} 