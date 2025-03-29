import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Box, CircularProgress } from '@mui/material';

interface DetectionResult {
  label: string;
  confidence: number;
  severity: 'normal' | 'mild' | 'severe';
}

interface AnalysisResult {
  findings: DetectionResult[];
  overall: string;
  confidence: number;
  processingTime: number;
}

interface DentalImageAnalysisProps {
  result: AnalysisResult;
  isLoading?: boolean;
}

const severityColors = {
  normal: 'success',
  mild: 'warning',
  severe: 'error'
} as const;

export const DentalImageAnalysis: React.FC<DentalImageAnalysisProps> = ({ result, isLoading = false }) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Analysis Results
        </Typography>

        {/* Overall Summary */}
        <Typography variant="body1" paragraph>
          {result.overall}
        </Typography>

        {/* Confidence Score */}
        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Overall Confidence: {(result.confidence * 100).toFixed(1)}%
          </Typography>
        </Box>

        {/* Findings List */}
        <Typography variant="subtitle1" gutterBottom>
          Detected Issues:
        </Typography>
        <List>
          {result.findings.map((finding, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{finding.label}</Typography>
                    <Chip
                      label={finding.severity}
                      color={severityColors[finding.severity]}
                      size="small"
                    />
                  </Box>
                }
                secondary={`Confidence: ${(finding.confidence * 100).toFixed(1)}%`}
              />
            </ListItem>
          ))}
        </List>

        {/* Processing Time */}
        <Typography variant="caption" color="text.secondary">
          Analysis completed in {(result.processingTime / 1000).toFixed(2)} seconds
        </Typography>
      </CardContent>
    </Card>
  );
}; 