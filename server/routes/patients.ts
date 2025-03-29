import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { patients } from "../db/schema";
import { authenticateUser } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router = Router();

const patientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  gender: z.enum(["male", "female", "other"]),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  status: z.enum(["active", "pending", "inactive"]).default("pending"),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  emergencyContact: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    relationship: z.string().min(2, "Relationship must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
  }),
  medicalHistory: z.object({
    conditions: z.array(z.object({
      name: z.string(),
      notes: z.string(),
      diagnosedDate: z.string().optional(),
    })).default([]),
    lastUpdated: z.string(),
  }).optional(),
  allergies: z.array(z.string()).default([]),
  currentMedications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    startDate: z.string().optional(),
  })).default([]),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string(),
    expirationDate: z.string().optional(),
  }).optional(),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    phone: z.boolean().default(false),
    preferredLanguage: z.string().default("English"),
  }),
});

// In-memory storage for MVP (replace with database later)
const patients: any[] = [];

// Get all patients for the current user
router.get('/', (req, res) => {
  const userPatients = patients.filter(p => p.userId === req.user?.userId);
  res.json(userPatients);
});

// Get a single patient
router.get('/:id', (req, res) => {
  const patient = patients.find(p => p.id === req.params.id && p.userId === req.user?.userId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

// Create a new patient
router.post('/', (req, res) => {
  const { name, dateOfBirth, gender, phone, email, address } = req.body;

  const patient = {
    id: uuidv4(),
    userId: req.user?.userId,
    name,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  patients.push(patient);
  res.status(201).json(patient);
});

// Update a patient
router.put('/:id', (req, res) => {
  const patientIndex = patients.findIndex(
    p => p.id === req.params.id && p.userId === req.user?.userId
  );

  if (patientIndex === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const { name, dateOfBirth, gender, phone, email, address } = req.body;

  patients[patientIndex] = {
    ...patients[patientIndex],
    name,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    updatedAt: new Date()
  };

  res.json(patients[patientIndex]);
});

// Delete a patient
router.delete('/:id', (req, res) => {
  const patientIndex = patients.findIndex(
    p => p.id === req.params.id && p.userId === req.user?.userId
  );

  if (patientIndex === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  patients.splice(patientIndex, 1);
  res.json({ message: 'Patient deleted successfully' });
});

// Get all patients (with pagination and search)
router.get("/", authenticateUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    const query = db.select().from(patients);

    if (search) {
      query.where(eq(patients.fullName, search));
      // TODO: Add more sophisticated search logic
    }

    const [totalCount, patientsList] = await Promise.all([
      db.select({ count: db.fn.count() }).from(patients).then(result => Number(result[0].count)),
      query.limit(limit).offset(offset),
    ]);

    res.json({
      patients: patientsList,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

// Get a single patient by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);

    if (!patient.length) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient[0]);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ error: "Failed to fetch patient" });
  }
});

// Update a patient
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const validatedData = patientSchema.partial().parse(req.body);

    if (validatedData.dateOfBirth) {
      validatedData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }

    const updatedPatient = await db.update(patients)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId))
      .returning();

    if (!updatedPatient.length) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(updatedPatient[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  }
});

// Delete a patient
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const deletedPatient = await db.delete(patients)
      .where(eq(patients.id, patientId))
      .returning();

    if (!deletedPatient.length) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

export default router; 