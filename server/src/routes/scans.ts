import { Router } from 'express';
import multer from 'multer';
import {
  getScans,
  getScan,
  uploadScan,
  analyzeScan,
  deleteScan,
} from '../controllers/scanController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', getScans);
router.get('/:id', getScan);
router.post('/upload', upload.single('scan'), uploadScan);
router.post('/:id/analyze', analyzeScan);
router.delete('/:id', deleteScan);

export const scanRouter = router; 