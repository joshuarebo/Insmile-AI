import { Router } from 'express';
import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from '../controllers/patientController';

const router = Router();

router.get('/', getPatients);
router.get('/:id', getPatient);
router.post('/', createPatient);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export const patientRouter = router; 