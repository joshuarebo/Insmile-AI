import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
}

export function FileUpload({
  onUpload,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg"],
    "application/dicom": [".dcm", ".dicom"],
    "application/pdf": [".pdf"],
  },
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
  });

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${files.length} file${files.length > 1 ? "s" : ""}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? "border-primary-500 bg-primary-50" : "border-neutral-300 hover:border-primary-500"}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <i className="fas fa-cloud-upload-alt text-3xl text-neutral-400"></i>
          <div className="text-neutral-600">
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag & drop files here, or click to select files
                <br />
                <span className="text-sm text-neutral-500">
                  Supported formats: DICOM, JPEG, PNG, PDF
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-700">
            Selected Files ({files.length})
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <i className="fas fa-file text-neutral-400"></i>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {uploading ? (
                  <Progress value={uploadProgress[file.name] || 0} className="w-20" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file);
                    }}
                  >
                    <i className="fas fa-times text-neutral-500"></i>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-cloud-upload-alt mr-2"></i>
              Upload {files.length > 0 ? `(${files.length})` : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 