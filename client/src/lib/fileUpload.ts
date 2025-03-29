import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Supported file types and their configurations
const FILE_CONFIGS = {
  'image/jpeg': {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.jpg', '.jpeg'],
    category: 'X-ray'
  },
  'image/png': {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.png'],
    category: 'X-ray'
  },
  'application/dicom': {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.dcm', '.dicom'],
    category: 'CBCT'
  }
};

export const useFileUpload = (
  acceptedFileTypes: string[] = Object.keys(FILE_CONFIGS)
) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // Check file type
    const fileType = Object.keys(FILE_CONFIGS).find(type => 
      file.type === type || 
      FILE_CONFIGS[type as keyof typeof FILE_CONFIGS].allowedExtensions
        .some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (!fileType || !acceptedFileTypes.includes(fileType)) {
      const allowedTypes = acceptedFileTypes
        .map(type => FILE_CONFIGS[type as keyof typeof FILE_CONFIGS].allowedExtensions.join(', '))
        .join(', ');
      
      setError(`File type not supported. Please upload: ${allowedTypes}`);
      toast({
        title: "Invalid file type",
        description: `Please upload one of: ${allowedTypes}`,
        variant: "destructive",
      });
      return false;
    }

    // Check file size
    const config = FILE_CONFIGS[fileType as keyof typeof FILE_CONFIGS];
    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      setError(`File is too large. Maximum size for ${fileType} is ${maxSizeMB}MB`);
      toast({
        title: "File too large",
        description: `Maximum size is ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      toast({
        title: "File selected",
        description: `${selectedFile.name} ready for upload`,
      });
    }
  };

  const uploadFile = async (patientId: number): Promise<string | null> => {
    if (!file) {
      setError("No file selected");
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId.toString());
      
      // Determine file type category
      const fileType = Object.keys(FILE_CONFIGS).find(type => 
        file.type === type || 
        FILE_CONFIGS[type as keyof typeof FILE_CONFIGS].allowedExtensions
          .some(ext => file.name.toLowerCase().endsWith(ext))
      );
      
      const category = fileType ? 
        FILE_CONFIGS[fileType as keyof typeof FILE_CONFIGS].category : 
        'Unknown';
      
      formData.append('category', category);

      // Upload progress tracking
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(Math.min(95, Math.round(percentComplete)));
        }
      });

      // Wrap XHR in a promise
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      // Start upload
      xhr.open('POST', '/api/scans/upload');
      xhr.send(formData);

      const response = await uploadPromise;
      const scanData = JSON.parse(response);
      
      setProgress(100);
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded`,
      });

      return scanData.id;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setError(null);
    setIsUploading(false);
  };

  return {
    file,
    isUploading,
    progress,
    error,
    handleFileChange,
    uploadFile,
    reset,
    acceptedFileTypes: FILE_CONFIGS
  };
};
