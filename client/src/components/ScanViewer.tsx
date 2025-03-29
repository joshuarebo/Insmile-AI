import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress } from '@mui/material';

interface ScanViewerProps {
  scanId: string;
  findings?: Array<{
    label: string;
    confidence: number;
    severity: 'normal' | 'mild' | 'severe';
    bbox?: [number, number, number, number];
  }>;
  highlightFindings?: boolean;
}

// Default dental scan placeholder
const DEFAULT_IMAGE = 'https://img.freepik.com/premium-photo/dental-xray-panoramic-teeth-scan-with-implants-prosthetic-brackets_190619-2145.jpg';

export const ScanViewer: React.FC<ScanViewerProps> = ({ 
  scanId, 
  findings = [], 
  highlightFindings = true 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load scan image
  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true);
      setError(null);
      
      // Handle demo scans
      if (scanId.startsWith('demo-scan-')) {
        setImageSrc(DEFAULT_IMAGE);
        setLoading(false);
        return;
      }
      
      try {
        // Attempt to get the actual image from the server
        const response = await axios.get(`http://localhost:3001/api/scans/${scanId}/image`, {
          responseType: 'blob'
        });
        
        const imageUrl = URL.createObjectURL(response.data);
        setImageSrc(imageUrl);
      } catch (error) {
        console.warn('Error loading scan image, using placeholder:', error);
        // Fallback to a placeholder
        setImageSrc(DEFAULT_IMAGE);
      } finally {
        setLoading(false);
      }
    };
    
    if (scanId) {
      fetchImage();
    } else {
      // Default placeholder if no scanId is provided
      setImageSrc(DEFAULT_IMAGE);
      setLoading(false);
    }
  }, [scanId]);
  
  // Draw bounding boxes for findings
  useEffect(() => {
    if (
      !loading && 
      imageSrc && 
      canvasRef.current && 
      findings.length > 0 && 
      highlightFindings
    ) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      const img = new Image();
      img.src = imageSrc;
      
      img.onload = () => {
        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Draw bounding boxes for findings
        findings.forEach(finding => {
          if (finding.bbox) {
            const [x, y, width, height] = finding.bbox;
            
            // Set style based on severity
            let strokeColor;
            switch (finding.severity) {
              case 'severe':
                strokeColor = 'rgba(255, 0, 0, 0.8)'; // Red for severe
                break;
              case 'mild':
                strokeColor = 'rgba(255, 165, 0, 0.8)'; // Orange for mild
                break;
              default:
                strokeColor = 'rgba(0, 128, 0, 0.8)'; // Green for normal
            }
            
            // Draw rectangle
            ctx.lineWidth = 3;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();
            
            // Draw label background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y - 20, ctx.measureText(finding.label).width + 10, 20);
            
            // Draw label text
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(finding.label, x + 5, y - 5);
          }
        });
      };
    }
  }, [imageSrc, findings, loading, highlightFindings]);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px" bgcolor="#f5f5f5" borderRadius={1}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px" bgcolor="#f5f5f5" borderRadius={1}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box position="relative" bgcolor="#f5f5f5" borderRadius={1} overflow="hidden">
      {/* Display the image directly if no findings or highlighting disabled */}
      {(!findings.length || !highlightFindings) ? (
        <img 
          src={imageSrc} 
          alt="Dental scan" 
          style={{ width: '100%', objectFit: 'contain', maxHeight: '400px' }}
          onError={() => setImageSrc(DEFAULT_IMAGE)}
        />
      ) : (
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', objectFit: 'contain', maxHeight: '400px' }}
        />
      )}
      
      {/* Legend for highlighted findings */}
      {highlightFindings && findings.length > 0 && (
        <Box 
          position="absolute" 
          bottom={8} 
          right={8} 
          bgcolor="rgba(255,255,255,0.9)" 
          p={1} 
          borderRadius={1}
        >
          <Box display="flex" alignItems="center" mb={0.5}>
            <Box width={12} height={12} mr={1} bgcolor="red" />
            <Typography variant="caption">Severe</Typography>
          </Box>
          <Box display="flex" alignItems="center" mb={0.5}>
            <Box width={12} height={12} mr={1} bgcolor="orange" />
            <Typography variant="caption">Mild</Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box width={12} height={12} mr={1} bgcolor="green" />
            <Typography variant="caption">Normal</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}; 