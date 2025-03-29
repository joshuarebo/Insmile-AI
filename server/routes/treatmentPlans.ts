import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BedrockTreatmentPlanner } from '../services/ai/nlp/bedrockTreatmentPlanner';

const router = express.Router();

// In-memory storage for MVP (replace with database later)
const treatmentPlans: any[] = [];

// Get all treatment plans for a patient
router.get('/patient/:patientId', (req, res) => {
  const patientPlans = treatmentPlans.filter(
    p => p.patientId === req.params.patientId && p.userId === req.user?.userId
  );
  res.json(patientPlans);
});

// Get a single treatment plan
router.get('/:id', (req, res) => {
  const plan = treatmentPlans.find(p => p.id === req.params.id && p.userId === req.user?.userId);
  if (!plan) {
    return res.status(404).json({ error: 'Treatment plan not found' });
  }
  res.json(plan);
});

// Generate a new treatment plan
router.post('/generate', async (req, res) => {
  try {
    const { patientId, scanId, findings, patientHistory } = req.body;

    // Create treatment plan record
    const plan = {
      id: uuidv4(),
      userId: req.user?.userId,
      patientId,
      scanId,
      status: 'generating',
      createdAt: new Date()
    };

    treatmentPlans.push(plan);

    // Generate treatment plan asynchronously
    generateTreatmentPlan(plan.id, findings, patientHistory).catch(error => {
      console.error('Error generating treatment plan:', error);
      const planIndex = treatmentPlans.findIndex(p => p.id === plan.id);
      if (planIndex !== -1) {
        treatmentPlans[planIndex].status = 'failed';
        treatmentPlans[planIndex].error = error.message;
      }
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate treatment plan' });
  }
});

// Update a treatment plan
router.put('/:id', (req, res) => {
  const planIndex = treatmentPlans.findIndex(
    p => p.id === req.params.id && p.userId === req.user?.userId
  );

  if (planIndex === -1) {
    return res.status(404).json({ error: 'Treatment plan not found' });
  }

  const updatedPlan = {
    ...treatmentPlans[planIndex],
    ...req.body,
    updatedAt: new Date()
  };

  treatmentPlans[planIndex] = updatedPlan;
  res.json(updatedPlan);
});

// Delete a treatment plan
router.delete('/:id', (req, res) => {
  const planIndex = treatmentPlans.findIndex(
    p => p.id === req.params.id && p.userId === req.user?.userId
  );

  if (planIndex === -1) {
    return res.status(404).json({ error: 'Treatment plan not found' });
  }

  treatmentPlans.splice(planIndex, 1);
  res.json({ message: 'Treatment plan deleted successfully' });
});

// Helper function to generate treatment plan
async function generateTreatmentPlan(planId: string, findings: string, patientHistory: any) {
  try {
    const planIndex = treatmentPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;

    // Update plan status
    treatmentPlans[planIndex].status = 'generating';

    // Initialize treatment planner
    const planner = new BedrockTreatmentPlanner();

    // Generate treatment plan
    const treatmentPlan = await planner.generateTreatmentPlan(findings, patientHistory);

    // Update plan with generated content
    treatmentPlans[planIndex].status = 'completed';
    treatmentPlans[planIndex].plan = treatmentPlan;
    treatmentPlans[planIndex].completedAt = new Date();
  } catch (error) {
    console.error('Error generating treatment plan:', error);
    throw error;
  }
}

export default router; 