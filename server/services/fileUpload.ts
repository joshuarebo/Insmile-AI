import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { randomUUID } from "crypto";
import dicomParser from "dicom-parser";
import { PDFDocument } from "pdf-lib";

// Supported file types and their content types
const SUPPORTED_FORMATS = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
  'application/dicom': ['dcm', 'dicom']
};

export class FileUploadService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dental-scans";

    if (!accountName || !accountKey) {
      throw new Error("Azure Storage credentials not configured");
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    this.initializeContainer();
  }

  private async initializeContainer() {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    await containerClient.createIfNotExists({
      access: "blob"
    });
  }

  public async uploadFile(file: Buffer, originalName: string, contentType: string): Promise<{ url: string; metadata: any }> {
    // Validate file type
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (!extension || !this.isSupported(contentType, extension)) {
      throw new Error("Unsupported file format");
    }

    // Generate unique filename
    const fileName = `${randomUUID()}.${extension}`;
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    // Extract metadata based on file type
    const metadata = await this.extractMetadata(file, contentType);

    // Upload file with metadata
    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType
      },
      metadata
    });

    return {
      url: blockBlobClient.url,
      metadata
    };
  }

  public async deleteFile(blobUrl: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobName = blobUrl.split('/').pop();
    if (!blobName) throw new Error("Invalid blob URL");

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
  }

  public async renameFile(oldBlobUrl: string, newName: string): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const oldBlobName = oldBlobUrl.split('/').pop();
    if (!oldBlobName) throw new Error("Invalid blob URL");

    const extension = oldBlobName.split('.').pop();
    const newBlobName = `${newName}.${extension}`;
    const sourceBlob = containerClient.getBlockBlobClient(oldBlobName);
    const targetBlob = containerClient.getBlockBlobClient(newBlobName);

    await targetBlob.beginCopyFromURL(sourceBlob.url);
    await sourceBlob.delete();

    return targetBlob.url;
  }

  private async extractMetadata(file: Buffer, contentType: string): Promise<any> {
    const metadata: any = {};

    try {
      switch (contentType) {
        case 'application/dicom':
          const dataSet = dicomParser.parseDicom(file);
          metadata.patientName = dataSet.string('x00100010');
          metadata.studyDate = dataSet.string('x00080020');
          metadata.modality = dataSet.string('x00080060');
          break;

        case 'application/pdf':
          const pdfDoc = await PDFDocument.load(file);
          metadata.pageCount = pdfDoc.getPageCount();
          metadata.title = pdfDoc.getTitle() || 'Untitled';
          break;

        case 'image/jpeg':
        case 'image/png':
          // For images, we could extract dimensions, but we'll keep it simple for now
          metadata.fileSize = file.length;
          break;
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }

    return metadata;
  }

  private isSupported(contentType: string, extension: string): boolean {
    return SUPPORTED_FORMATS[contentType as keyof typeof SUPPORTED_FORMATS]?.includes(extension);
  }

  public async generatePreviewUrl(blobUrl: string): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobName = blobUrl.split('/').pop();
    if (!blobName) throw new Error("Invalid blob URL");

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Generate SAS token for temporary access
    const sasToken = await blockBlobClient.generateSasUrl({
      permissions: "r",
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
    });

    return sasToken;
  }
}

export const fileUpload = new FileUploadService(); 