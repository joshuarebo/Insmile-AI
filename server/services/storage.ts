import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { randomUUID } from "crypto";

// Azure Storage configuration
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "dental-scans";

// Initialize Azure Blob Storage client
const sharedKeyCredential = accountName && accountKey
  ? new StorageSharedKeyCredential(accountName, accountKey)
  : null;

const blobServiceClient = accountName && sharedKeyCredential
  ? new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    )
  : null;

export class AzureStorageService {
  private containerClient = blobServiceClient?.getContainerClient(containerName);

  constructor() {
    this.initializeContainer();
  }

  private async initializeContainer() {
    if (!this.containerClient) {
      console.warn("Azure Blob Storage not configured. Files will be stored locally.");
      return;
    }

    try {
      await this.containerClient.createIfNotExists({
        access: "blob"
      });
    } catch (error) {
      console.error("Failed to initialize blob container:", error);
    }
  }

  async uploadFile(file: Buffer, originalName: string, contentType: string): Promise<string> {
    // Generate a unique blob name
    const extension = originalName.split('.').pop();
    const blobName = `${randomUUID()}.${extension}`;

    if (this.containerClient) {
      // Upload to Azure Blob Storage
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(file, file.length, {
        blobHTTPHeaders: {
          blobContentType: contentType
        }
      });

      return blockBlobClient.url;
    } else {
      // Fallback to local storage for development
      const localPath = `./uploads/${blobName}`;
      await require('fs').promises.mkdir('./uploads', { recursive: true });
      await require('fs').promises.writeFile(localPath, file);
      return `/uploads/${blobName}`;
    }
  }

  async deleteFile(blobUrl: string): Promise<void> {
    if (!this.containerClient) {
      // Handle local file deletion
      const localPath = `.${new URL(blobUrl).pathname}`;
      await require('fs').promises.unlink(localPath);
      return;
    }

    const blobName = blobUrl.split('/').pop();
    if (!blobName) throw new Error("Invalid blob URL");

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
  }

  async getFileUrl(blobName: string): Promise<string> {
    if (!this.containerClient) {
      return `/uploads/${blobName}`;
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }
}

// Export singleton instance
export const storageService = new AzureStorageService(); 