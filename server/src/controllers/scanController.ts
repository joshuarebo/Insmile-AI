import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { analyzeDentalImage } from '../services/ai/analyzeDentalImage';

interface Scan {
  id: string;
  patientId: string;
  userId: string;
  filename: string;
  path: string;
  analysis?: any;
  createdAt: string;
}

// In-memory scan storage (replace with database in production)
const scans: Scan[] = [];

export const getScans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id;
    const userScans = scans.filter((scan) => scan.userId === userId);
    res.json(userScans);
  } catch (error) {
    next(error);
  }
};

export const getScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const scan = scans.find((s) => s.id === id && s.userId === userId);

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    res.json(scan);
  } catch (error) {
    next(error);
  }
};

export const uploadScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { patientId } = req.body;
    const userId = (req as any).user.id;

    if (!patientId) {
      throw new AppError('Patient ID is required', 400);
    }

    const newScan: Scan = {
      id: Date.now().toString(),
      patientId,
      userId,
      filename: req.file.originalname,
      path: req.file.path,
      createdAt: new Date().toISOString(),
    };

    scans.push(newScan);

    res.status(201).json(newScan);
  } catch (error) {
    next(error);
  }
};

export const analyzeScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const scan = scans.find((s) => s.id === id && s.userId === userId);

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    // Analyze the scan using the AI service
    const analysis = await analyzeDentalImage(scan.path);
    scan.analysis = analysis;

    res.json(scan);
  } catch (error) {
    next(error);
  }
};

export const deleteScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const scanIndex = scans.findIndex((s) => s.id === id && s.userId === userId);

    if (scanIndex === -1) {
      throw new AppError('Scan not found', 404);
    }

    scans.splice(scanIndex, 1);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}; 