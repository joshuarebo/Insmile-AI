import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("dentist"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("pending"),
  riskLevel: text("risk_level").notNull().default("medium"),
  lastVisit: timestamp("last_visit"),
  nextSteps: text("next_steps"),
  emergencyContact: jsonb("emergency_contact"),
  medicalHistory: jsonb("medical_history"),
  allergies: jsonb("allergies").default("[]"),
  currentMedications: jsonb("current_medications").default("[]"),
  insuranceInfo: jsonb("insurance_info"),
  communicationPreferences: jsonb("communication_preferences"),
  assignedDentistId: integer("assigned_dentist_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  status: text("status").default("pending"),
  tokensUsed: integer("tokens_used"),
  analysis: jsonb("analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  dentistId: integer("dentist_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("draft"),
  estimatedCost: integer("estimated_cost"),
  procedures: jsonb("procedures").default("[]"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  dentistId: integer("dentist_id").notNull().references(() => users.id),
  dateTime: timestamp("date_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
  assignedDentist: one(users, {
    fields: [patients.assignedDentistId],
    references: [users.id],
  }),
  scans: many(scans),
  treatmentPlans: many(treatmentPlans),
  appointments: many(appointments),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  patient: one(patients, {
    fields: [scans.patientId],
    references: [patients.id],
  }),
}));

export const treatmentPlansRelations = relations(treatmentPlans, ({ one }) => ({
  patient: one(patients, {
    fields: [treatmentPlans.patientId],
    references: [patients.id],
  }),
  dentist: one(users, {
    fields: [treatmentPlans.dentistId],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  dentist: one(users, {
    fields: [appointments.dentistId],
    references: [users.id],
  }),
})); 