import { useQuery } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients?.filter(patient => {
    const search = searchTerm.toLowerCase();
    const fullName = patient?.fullName?.toLowerCase() || '';
    const patientId = patient?.patientId?.toLowerCase() || '';
    
    return fullName.includes(search) || patientId.includes(search);
  });

  const getStatusClass = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'follow-up':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const formatStatus = (status: string | null | undefined) => {
    if (!status) return 'Pending';
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    return status.toLowerCase() === 'active' ? `${formattedStatus} Treatment` : formattedStatus;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800">Recent Patients</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your patient records and treatment plans
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-neutral-400">
              <i className="fas fa-search"></i>
            </div>
          </div>
          <Button className="ml-3" size="sm">
            <i className="fas fa-filter mr-2"></i>Filter
          </Button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Patient
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Patient ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Last Visit
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Next Steps
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {isLoading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="ml-4">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </td>
                </tr>
              ))
            ) : filteredPatients?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                  No patients found matching your search criteria
                </td>
              </tr>
            ) : (
              filteredPatients?.map((patient) => (
                <tr key={patient.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500">
                        <i className="fas fa-user text-xs"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {patient.fullName}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {patient.patientId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(patient.status)}`}>
                      {formatStatus(patient.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {patient.lastVisit ? formatDate(patient.lastVisit) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.nextSteps?.includes("AI Analysis") ? (
                      <span className="flex items-center text-accent-500">
                        <i className="fas fa-brain mr-1"></i> {patient.nextSteps}
                      </span>
                    ) : patient.nextSteps?.includes("Treatment Plan") ? (
                      <span className="flex items-center text-success">
                        <i className="fas fa-clipboard-check mr-1"></i> {patient.nextSteps}
                      </span>
                    ) : (
                      <span className="flex items-center text-neutral-500">
                        <i className="fas fa-calendar-alt mr-1"></i> {patient.nextSteps || 'No next steps'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button className="text-primary-500 hover:text-primary-700">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="text-neutral-500 hover:text-neutral-700">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="text-neutral-500 hover:text-neutral-700">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <div className="flex items-center text-sm text-neutral-700">
          <span>
            Showing <strong>1-{filteredPatients?.length || 0}</strong> of{" "}
            <strong>{patients?.length || 0}</strong> patients
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-100 disabled:opacity-50"
            disabled
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="px-3 py-1 border border-neutral-300 bg-primary-500 text-white rounded-md hover:bg-primary-600">
            1
          </button>
          <button className="px-3 py-1 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-100">
            2
          </button>
          <button className="px-3 py-1 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-100">
            3
          </button>
          <button className="px-3 py-1 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-100">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
