import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Patient } from "@/types";

interface PatientDetailsProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientDetails({ patient, isOpen, onClose }: PatientDetailsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-neutral-200 flex items-center justify-center">
                <i className="fas fa-user text-neutral-500 text-lg"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{patient.fullName}</h2>
                <p className="text-sm text-neutral-500">
                  Patient ID: {patient.patientId}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <i className="fas fa-times"></i>
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="medical">Medical History</TabsTrigger>
                <TabsTrigger value="treatment">Treatment Plans</TabsTrigger>
                <TabsTrigger value="scans">Dental Scans</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <i className="fas fa-calendar-alt w-5 text-neutral-500"></i>
                        <span className="font-medium mr-2">Date of Birth:</span>
                        {formatDate(patient.dateOfBirth)}
                      </div>
                      <div className="flex items-center text-sm">
                        <i className="fas fa-venus-mars w-5 text-neutral-500"></i>
                        <span className="font-medium mr-2">Gender:</span>
                        {patient.gender}
                      </div>
                      <div className="flex items-center text-sm">
                        <i className="fas fa-phone w-5 text-neutral-500"></i>
                        <span className="font-medium mr-2">Phone:</span>
                        {patient.phone}
                      </div>
                      <div className="flex items-center text-sm">
                        <i className="fas fa-envelope w-5 text-neutral-500"></i>
                        <span className="font-medium mr-2">Email:</span>
                        {patient.email}
                      </div>
                      <div className="flex items-start text-sm">
                        <i className="fas fa-map-marker-alt w-5 mt-1 text-neutral-500"></i>
                        <div>
                          <span className="font-medium mr-2">Address:</span>
                          <p className="whitespace-pre-wrap">{patient.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Risk Assessment */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Status & Risk Assessment</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium">Current Status</span>
                        <div className="mt-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            patient.status === 'active' ? 'bg-green-100 text-green-800' :
                            patient.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-neutral-100 text-neutral-800'
                          }`}>
                            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Risk Level</span>
                        <div className="mt-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            patient.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                            patient.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {patient.riskLevel?.charAt(0).toUpperCase() + patient.riskLevel?.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Next Steps</span>
                        <div className="mt-1 text-sm">
                          {patient.nextSteps}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Last Visit</span>
                        <div className="mt-1 text-sm">
                          {formatDate(patient.lastVisit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Emergency Contact</h3>
                    <div className="text-sm space-y-2">
                      {patient.emergencyContact && (
                        <div className="space-y-1">
                          <div>{patient.emergencyContact.name}</div>
                          <div>{patient.emergencyContact.relationship}</div>
                          <div>{patient.emergencyContact.phone}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Insurance Information</h3>
                    <div className="text-sm space-y-2">
                      {patient.insuranceInfo && (
                        <div className="space-y-1">
                          <div>Provider: {patient.insuranceInfo.provider}</div>
                          <div>Policy Number: {patient.insuranceInfo.policyNumber}</div>
                          <div>Group Number: {patient.insuranceInfo.groupNumber}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical">
                <div className="space-y-6">
                  {/* Medical History */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Medical History</h3>
                    <div className="space-y-4">
                      {patient.medicalHistory?.conditions?.map((condition, index) => (
                        <div key={index} className="p-4 bg-neutral-50 rounded-lg">
                          <div className="font-medium">{condition.name}</div>
                          <div className="text-sm text-neutral-600 mt-1">{condition.notes}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies?.map((allergy, index) => (
                        <span key={index} className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Current Medications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Current Medications</h3>
                    <div className="space-y-2">
                      {patient.currentMedications?.map((medication, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <i className="fas fa-pills text-neutral-500"></i>
                          <span>{medication.name} - {medication.dosage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="treatment">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Treatment Plans</h3>
                  {/* Treatment plans will be implemented in the next phase */}
                  <p className="text-neutral-500">Treatment plans will be displayed here.</p>
                </div>
              </TabsContent>

              <TabsContent value="scans">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Dental Scans</h3>
                  {/* Scans will be implemented in the next phase */}
                  <p className="text-neutral-500">Dental scans will be displayed here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>
              Edit Patient
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 