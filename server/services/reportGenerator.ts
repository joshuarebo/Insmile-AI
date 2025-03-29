import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from './database';

export class ReportGenerator {
  private async createBasePDF() {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    
    return {
      pdfDoc,
      timesRomanFont,
      page,
      currentY: page.getHeight() - 50 // Start from top with margin
    };
  }

  private async addHeader(page: any, font: any, y: number, text: string) {
    page.drawText(text, {
      x: 50,
      y,
      size: 16,
      font,
      color: rgb(0, 0, 0)
    });
    return y - 30;
  }

  private async addText(page: any, font: any, y: number, text: string) {
    page.drawText(text, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
    return y - 20;
  }

  public async generateTreatmentPlanReport(treatmentPlanId: number): Promise<Buffer> {
    const treatmentPlan = await db.findTreatmentPlans({ id: treatmentPlanId });
    if (!treatmentPlan || !treatmentPlan[0]) {
      throw new Error('Treatment plan not found');
    }

    const plan = treatmentPlan[0];
    const { pdfDoc, timesRomanFont, page, currentY } = await this.createBasePDF();

    let y = currentY;

    // Add clinic logo and header
    y = await this.addHeader(page, timesRomanFont, y, 'Treatment Plan Report');
    y -= 20;

    // Patient Information
    y = await this.addHeader(page, timesRomanFont, y, 'Patient Information');
    y = await this.addText(page, timesRomanFont, y, `Name: ${plan.patient.fullName}`);
    y = await this.addText(page, timesRomanFont, y, `ID: ${plan.patient.patientId}`);
    y = await this.addText(page, timesRomanFont, y, `Date of Birth: ${plan.patient.dateOfBirth}`);
    y -= 20;

    // Treatment Plan Details
    y = await this.addHeader(page, timesRomanFont, y, 'Treatment Plan Details');
    y = await this.addText(page, timesRomanFont, y, `Title: ${plan.title}`);
    y = await this.addText(page, timesRomanFont, y, `Status: ${plan.status}`);
    y = await this.addText(page, timesRomanFont, y, `Completion: ${plan.completionRate}%`);
    y -= 20;

    // Treatment Steps
    y = await this.addHeader(page, timesRomanFont, y, 'Treatment Steps');
    const steps = plan.steps as any[];
    for (const step of steps) {
      y = await this.addText(page, timesRomanFont, y, `• ${step.description}`);
      if (step.status) {
        y = await this.addText(page, timesRomanFont, y, `  Status: ${step.status}`);
      }
      y -= 10;
    }

    // If analysis is available, add AI analysis results
    if (plan.analysis) {
      y -= 20;
      y = await this.addHeader(page, timesRomanFont, y, 'AI Analysis Results');
      y = await this.addText(page, timesRomanFont, y, `Confidence: ${plan.analysis.confidence}%`);
      
      const results = plan.analysis.results as any;
      if (results.findings) {
        y -= 10;
        y = await this.addText(page, timesRomanFont, y, 'Findings:');
        for (const finding of results.findings) {
          y = await this.addText(page, timesRomanFont, y, `• ${finding.description}`);
        }
      }
    }

    // Footer with generation date
    const footerY = 50;
    await this.addText(
      page,
      timesRomanFont,
      footerY,
      `Generated on ${new Date().toLocaleDateString()}`
    );

    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  public async generatePatientReport(patientId: number): Promise<Buffer> {
    const patient = await db.findPatients({ id: patientId });
    if (!patient || !patient[0]) {
      throw new Error('Patient not found');
    }

    const patientData = patient[0];
    const { pdfDoc, timesRomanFont, page, currentY } = await this.createBasePDF();

    let y = currentY;

    // Header
    y = await this.addHeader(page, timesRomanFont, y, 'Patient Medical Report');
    y -= 20;

    // Patient Information
    y = await this.addHeader(page, timesRomanFont, y, 'Patient Information');
    y = await this.addText(page, timesRomanFont, y, `Name: ${patientData.fullName}`);
    y = await this.addText(page, timesRomanFont, y, `ID: ${patientData.patientId}`);
    y = await this.addText(page, timesRomanFont, y, `Date of Birth: ${patientData.dateOfBirth}`);
    y = await this.addText(page, timesRomanFont, y, `Gender: ${patientData.gender}`);
    y = await this.addText(page, timesRomanFont, y, `Risk Level: ${patientData.riskLevel}`);
    y -= 20;

    // Medical History
    if (patientData.medicalHistory) {
      y = await this.addHeader(page, timesRomanFont, y, 'Medical History');
      const history = patientData.medicalHistory as any;
      if (history.conditions) {
        for (const condition of history.conditions) {
          y = await this.addText(
            page,
            timesRomanFont,
            y,
            `• ${condition.name} (${condition.diagnosedDate || 'Date unknown'})`
          );
          if (condition.notes) {
            y = await this.addText(page, timesRomanFont, y, `  Notes: ${condition.notes}`);
          }
          y -= 10;
        }
      }
    }

    // Treatment Plans Summary
    if (patientData.treatmentPlans && patientData.treatmentPlans.length > 0) {
      y -= 20;
      y = await this.addHeader(page, timesRomanFont, y, 'Treatment Plans');
      for (const plan of patientData.treatmentPlans) {
        y = await this.addText(
          page,
          timesRomanFont,
          y,
          `• ${plan.title} (${plan.status}) - ${plan.completionRate}% complete`
        );
      }
    }

    // Footer
    const footerY = 50;
    await this.addText(
      page,
      timesRomanFont,
      footerY,
      `Generated on ${new Date().toLocaleDateString()}`
    );

    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

export const reportGenerator = new ReportGenerator(); 