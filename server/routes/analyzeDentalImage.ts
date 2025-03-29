import express from 'express';
import multer from 'multer';
import { analyzeXRay, analyzePanoramic, analyzeIntraoral, markupImage } from '../services/ai/vision/imageAnalysis';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const analysisType = req.body.type as 'xray' | 'panoramic' | 'intraoral';
    if (!analysisType) {
      return res.status(400).json({ error: 'Analysis type is required' });
    }

    console.log('Analyzing image:', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      analysisType,
    });

    // Use the appropriate analysis function based on the image type
    let result;
    switch (analysisType) {
      case 'xray':
        result = await analyzeXRay(req.file.buffer);
        break;
      case 'panoramic':
        result = await analyzePanoramic(req.file.buffer);
        break;
      case 'intraoral':
        result = await analyzeIntraoral(req.file.buffer);
        break;
      default:
        return res.status(400).json({ error: 'Invalid analysis type' });
    }
    
    console.log('Analysis result:', result);
    
    // Generate marked up image if findings have bounding boxes
    if (result.findings.some(finding => finding.bbox)) {
      try {
        const markedImage = await markupImage(req.file.buffer, result.findings);
        // Convert to base64 for frontend display
        const base64Image = markedImage.toString('base64');
        result.markedImage = `data:image/jpeg;base64,${base64Image}`;
      } catch (markupError) {
        console.warn('Failed to create marked up image:', markupError);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error analyzing dental image:', error);
    res.status(500).json({ 
      error: 'Failed to analyze dental image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
