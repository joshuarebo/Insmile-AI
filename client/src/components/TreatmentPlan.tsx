import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { TreatmentPlan } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface TreatmentPlanProps {
  patientId: string;
  scanId: string;
}

const TreatmentPlanComponent: React.FC<TreatmentPlanProps> = ({ patientId, scanId }) => {
  const queryClient = useQueryClient();

  const { data: treatmentPlan, isLoading } = useQuery({
    queryKey: ['treatmentPlan', patientId, scanId],
    queryFn: async () => {
      const response = await fetch(`/api/treatment-plans/${patientId}/${scanId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch treatment plan');
      }
      return response.json();
    },
    enabled: !!patientId && !!scanId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/treatment-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId, scanId }),
      });
      if (!response.ok) {
        throw new Error('Failed to create treatment plan');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentPlan', patientId, scanId] });
      toast({
        title: 'Success',
        description: 'Treatment plan created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create treatment plan',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: TreatmentPlan['status']) => {
      const response = await fetch(`/api/treatment-plans/${treatmentPlan?.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update treatment plan status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatmentPlan', patientId, scanId] });
      toast({
        title: 'Success',
        description: 'Treatment plan status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update treatment plan status',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!treatmentPlan) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No treatment plan found</p>
        <Button onClick={() => createMutation.mutate()}>Create Treatment Plan</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Treatment Plan</h2>
          <p className="text-sm text-gray-600">
            Created on {format(new Date(treatmentPlan.createdAt), 'PPP')}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            treatmentPlan.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : treatmentPlan.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {treatmentPlan.status.charAt(0).toUpperCase() + treatmentPlan.status.slice(1)}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Diagnosis</h3>
          <p className="mt-1 text-sm">{treatmentPlan.diagnosis}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Treatment Steps</h3>
          <ol className="list-decimal list-inside space-y-2">
            {treatmentPlan.treatmentSteps.map((step, index) => (
              <li key={index} className="text-sm">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Estimated Cost</h3>
            <p className="mt-1 text-sm">${treatmentPlan.estimatedCost.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Duration</h3>
            <p className="mt-1 text-sm">{treatmentPlan.duration}</p>
          </div>
        </div>

        {treatmentPlan.status === 'pending' && (
          <div className="flex justify-end space-x-4">
            <Button
              variant="destructive"
              onClick={() => updateStatusMutation.mutate('rejected')}
            >
              Reject
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate('approved')}
            >
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentPlanComponent; 