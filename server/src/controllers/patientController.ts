import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  userId: string;
}

// In-memory patient storage (replace with database in production)
const patients: Patient[] = [];

export const getPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id;
    const userPatients = patients.filter((patient) => patient.userId === userId);
    res.json(userPatients);
  } catch (error) {
    next(error);
  }
};

export const getPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const patient = patients.find(
      (p) => p.id === id && p.userId === userId
    );

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, phone, dateOfBirth } = req.body;
    const userId = (req as any).user.id;

    if (!name || !email || !phone || !dateOfBirth) {
      throw new AppError('All fields are required', 400);
    }

    const newPatient: Patient = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      dateOfBirth,
      userId,
    };

    patients.push(newPatient);

    res.status(201).json(newPatient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, email, phone, dateOfBirth } = req.body;
    const userId = (req as any).user.id;

    const patientIndex = patients.findIndex(
      (p) => p.id === id && p.userId === userId
    );

    if (patientIndex === -1) {
      throw new AppError('Patient not found', 404);
    }

    patients[patientIndex] = {
      ...patients[patientIndex],
      name: name || patients[patientIndex].name,
      email: email || patients[patientIndex].email,
      phone: phone || patients[patientIndex].phone,
      dateOfBirth: dateOfBirth || patients[patientIndex].dateOfBirth,
    };

    res.json(patients[patientIndex]);
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const patientIndex = patients.findIndex(
      (p) => p.id === id && p.userId === userId
    );

    if (patientIndex === -1) {
      throw new AppError('Patient not found', 404);
    }

    patients.splice(patientIndex, 1);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}; 