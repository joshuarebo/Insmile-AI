import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  },
});

export const uploadFile = async (file: File, patientId: string): Promise<string> => {
  const key = `scans/${patientId}/${Date.now()}-${file.name}`;
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: import.meta.env.VITE_AWS_BUCKET_NAME || '',
      Key: key,
      Body: file,
      ContentType: file.type,
    },
  });

  try {
    await upload.done();
    return `https://${import.meta.env.VITE_AWS_BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}; 