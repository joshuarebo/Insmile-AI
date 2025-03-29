import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class DatabaseService {
  // User operations
  async createUser(data: any) {
    const hashedPassword = await bcrypt.hash(
      data.password,
      Number(process.env.BCRYPT_SALT_ROUNDS)
    );

    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async validateUser(username: string, password: string) {
    const user = await this.findUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  // Patient operations
  async createPatient(data: any) {
    return prisma.patient.create({
      data,
      include: {
        clinic: true,
      },
    });
  }

  async updatePatient(id: number, data: any) {
    return prisma.patient.update({
      where: { id },
      data,
      include: {
        clinic: true,
      },
    });
  }

  async deletePatient(id: number) {
    return prisma.patient.delete({
      where: { id },
    });
  }

  async findPatients(filters: any = {}) {
    const where: any = {};
    
    if (filters.clinicId) {
      where.clinicId = filters.clinicId;
    }
    
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { patientId: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.patient.findMany({
      where,
      include: {
        clinic: true,
        scans: true,
        treatmentPlans: true,
      },
      orderBy: {
        lastVisit: 'desc',
      },
    });
  }

  // Scan operations
  async createScan(data: any) {
    return prisma.scan.create({
      data,
      include: {
        patient: true,
        uploader: true,
      },
    });
  }

  async updateScan(id: number, data: any) {
    return prisma.scan.update({
      where: { id },
      data,
      include: {
        patient: true,
        analysis: true,
      },
    });
  }

  async deleteScan(id: number) {
    return prisma.scan.delete({
      where: { id },
    });
  }

  async findScans(filters: any = {}) {
    const where: any = {};
    
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    
    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.scan.findMany({
      where,
      include: {
        patient: true,
        analysis: true,
        reports: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  // Treatment Plan operations
  async createTreatmentPlan(data: any) {
    return prisma.treatmentPlan.create({
      data,
      include: {
        patient: true,
        creator: true,
        analysis: true,
      },
    });
  }

  async updateTreatmentPlan(id: number, data: any) {
    return prisma.treatmentPlan.update({
      where: { id },
      data,
      include: {
        patient: true,
        creator: true,
        analysis: true,
      },
    });
  }

  async deleteTreatmentPlan(id: number) {
    return prisma.treatmentPlan.delete({
      where: { id },
    });
  }

  async findTreatmentPlans(filters: any = {}) {
    const where: any = {};
    
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    
    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.treatmentPlan.findMany({
      where,
      include: {
        patient: true,
        creator: true,
        analysis: true,
        reports: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Report operations
  async createReport(data: any) {
    return prisma.report.create({
      data,
      include: {
        scan: true,
        treatmentPlan: true,
      },
    });
  }

  async findReports(filters: any = {}) {
    const where: any = {};
    
    if (filters.scanId) {
      where.scanId = filters.scanId;
    }
    
    if (filters.treatmentPlanId) {
      where.treatmentPlanId = filters.treatmentPlanId;
    }
    
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }

    return prisma.report.findMany({
      where,
      include: {
        scan: true,
        treatmentPlan: true,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  }

  // Activity logging
  async logActivity(data: any) {
    return prisma.activity.create({
      data,
      include: {
        user: true,
      },
    });
  }

  // Utility method to generate JWT token
  generateToken(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }
}

export const db = new DatabaseService(); 