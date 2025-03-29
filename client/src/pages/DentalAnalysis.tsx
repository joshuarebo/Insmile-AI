import React, { useState } from 'react';
import { Box, Button, Container, Typography, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DentalImageAnalysis } from '../components/DentalImageAnalysis';
import { useDentalImageAnalysis } from '../hooks/useDentalImageAnalysis';

export const DentalAnalysis: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<'xray' | 'panoramic' | 'intraoral'>('xray');
  const { analyzeImage, isLoading, error, result } = useDentalImageAnalysis();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (selectedFile) {
      await analyzeImage(selectedFile, analysisType);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dental Image Analysis
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="image-upload">
              <Button variant="contained" component="span">
                Select Image
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {selectedFile.name}
              </Typography>
            )}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={analysisType}
              label="Analysis Type"
              onChange={(e) => setAnalysisType(e.target.value as typeof analysisType)}
            >
              <MenuItem value="xray">X-ray</MenuItem>
              <MenuItem value="panoramic">Panoramic</MenuItem>
              <MenuItem value="intraoral">Intraoral</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAnalyze}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Image'}
          </Button>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Paper>

        {result && <DentalImageAnalysis result={result} isLoading={isLoading} />}
      </Box>
    </Container>
  );
}; 