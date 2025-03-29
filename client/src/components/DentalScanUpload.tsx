import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/auth';

interface DentalScanUploadProps {
  patientId: string;
}

const DentalScanUpload: React.FC<DentalScanUploadProps> = ({ patientId }) => {
  const queryClient = useQueryClient();

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);

    try {
      await apiRequest('POST', '/api/scans/upload', formData);
      
      await queryClient.invalidateQueries({ queryKey: ['scans', patientId] });
      
      toast({
        title: 'Success',
        description: 'Scan uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload scan',
        variant: 'destructive',
      });
    }
  }, [patientId, queryClient]);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Upload New Scan</h3>
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept=".stl,.obj,.ply"
          onChange={handleUpload}
          className="hidden"
          id="scan-upload"
        />
        <label htmlFor="scan-upload">
          <Button asChild>
            <span>Choose File</span>
          </Button>
        </label>
        <p className="text-sm text-gray-600">
          Supported formats: STL, OBJ, PLY
        </p>
      </div>
    </div>
  );
};

export default DentalScanUpload; 