import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { generatePatientReport } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { Patient, TreatmentPlan, Analysis } from "@/types/schema";

export default function Reports() {
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch treatment plans for selected patient
  const { data: treatmentPlans } = useQuery<TreatmentPlan[]>({
    queryKey: [`/api/treatment-plans?patientId=${selectedPatientId}`],
    enabled: !!selectedPatientId,
  });

  // Fetch analyses for selected patient
  const { data: analyses } = useQuery<Analysis[]>({
    queryKey: [`/api/scans?patientId=${selectedPatientId}`],
    enabled: !!selectedPatientId,
  });

  const selectedPatient = patients?.find(p => p.id === selectedPatientId);
  
  // Generate report handler
  const handleGenerateReport = async () => {
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // In a real app, this would call an API to generate a PDF
      // For the MVP, we're using a browser-side report generator
      const latestTreatmentPlan = treatmentPlans?.[0] || null;
      const latestAnalysis = analyses?.[0] || null;
      
      await generatePatientReport(
        selectedPatient,
        latestAnalysis,
        latestTreatmentPlan
      );
      
      toast({
        title: "Report Generated",
        description: "Patient report has been generated and downloaded",
      });
    } catch (error) {
      toast({
        title: "Failed to Generate Report",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Reports</h1>
              <p className="text-neutral-500 mt-1">
                Generate and export patient reports and analytics
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="patient" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="patient">Patient Reports</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="export">Data Export</TabsTrigger>
            </TabsList>
            
            {/* Patient Reports Tab */}
            <TabsContent value="patient">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Generate Patient Report</CardTitle>
                    <CardDescription>
                      Create comprehensive reports for patients and treatments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Patient
                      </label>
                      <Select onValueChange={(value) => setSelectedPatientId(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients?.map(patient => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.fullName} ({patient.patientId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPatient && (
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <h3 className="font-medium text-neutral-800 mb-2">Selected Patient</h3>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-neutral-500">Name:</span> {selectedPatient.fullName}</p>
                          <p><span className="text-neutral-500">ID:</span> {selectedPatient.patientId}</p>
                          <p><span className="text-neutral-500">Age:</span> {selectedPatient.age}</p>
                          <p><span className="text-neutral-500">Status:</span> <span className="capitalize">{selectedPatient.status}</span></p>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-neutral-700 mb-1">Available Data</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${treatmentPlans && treatmentPlans.length > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                              {treatmentPlans && treatmentPlans.length > 0 ? `${treatmentPlans.length} Treatment Plans` : 'No Treatment Plans'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${analyses && analyses.length > 0 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                              {analyses && analyses.length > 0 ? `${analyses.length} AI Analyses` : 'No AI Analyses'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleGenerateReport} 
                      className="w-full"
                      disabled={!selectedPatient || isGenerating}
                    >
                      {isGenerating ? (
                        <span className="flex items-center">
                          <i className="fas fa-spinner fa-spin mr-2"></i> Generating...
                        </span>
                      ) : (
                        <>
                          <i className="fas fa-file-pdf mr-2"></i> Generate Report
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>
                      View and download previously generated reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                        <i className="fas fa-file-pdf text-2xl"></i>
                      </div>
                      <h3 className="text-neutral-600 font-medium mb-2">No Recent Reports</h3>
                      <p className="text-sm text-neutral-500 max-w-md mx-auto">
                        Generated reports will appear here. Select a patient and report type, then click "Generate Report" to create a new report.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Clinic Analytics</CardTitle>
                  <CardDescription>
                    View detailed analytics about patients, treatments, and procedures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                      <i className="fas fa-chart-bar text-2xl"></i>
                    </div>
                    <h3 className="text-neutral-600 font-medium mb-2">Analytics Coming Soon</h3>
                    <p className="text-sm text-neutral-500 max-w-md mx-auto">
                      Detailed analytics including procedure success rates, treatment timelines, and patient demographics will be available in the next update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Data Export Tab */}
            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle>Data Export</CardTitle>
                  <CardDescription>
                    Export patient and treatment data in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                      <i className="fas fa-file-export text-2xl"></i>
                    </div>
                    <h3 className="text-neutral-600 font-medium mb-2">Export Feature Coming Soon</h3>
                    <p className="text-sm text-neutral-500 max-w-md mx-auto">
                      You'll soon be able to export your data in various formats including CSV, Excel, and JSON for integration with other systems.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Report Templates Section */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Report Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-50 text-primary-500 rounded-lg mb-4">
                    <i className="fas fa-clipboard-list text-xl"></i>
                  </div>
                  <h3 className="font-medium text-neutral-800 mb-1">Treatment Plan</h3>
                  <p className="text-sm text-neutral-500 mb-4">
                    Detailed treatment steps, timeline, and cost estimates
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Default template</span>
                    <span className="flex items-center text-primary-500">
                      <i className="fas fa-check-circle mr-1"></i> Active
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-accent-50 text-accent-500 rounded-lg mb-4">
                    <i className="fas fa-brain text-xl"></i>
                  </div>
                  <h3 className="font-medium text-neutral-800 mb-1">AI Diagnostic</h3>
                  <p className="text-sm text-neutral-500 mb-4">
                    AI findings, confidence scores, and recommendations
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Default template</span>
                    <span className="flex items-center text-primary-500">
                      <i className="fas fa-check-circle mr-1"></i> Active
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-50 text-green-500 rounded-lg mb-4">
                    <i className="fas fa-chart-line text-xl"></i>
                  </div>
                  <h3 className="font-medium text-neutral-800 mb-1">Progress Report</h3>
                  <p className="text-sm text-neutral-500 mb-4">
                    Treatment progress, milestones, and next steps
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Default template</span>
                    <span className="flex items-center text-primary-500">
                      <i className="fas fa-check-circle mr-1"></i> Active
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[173px]">
                  <div className="flex items-center justify-center w-12 h-12 bg-neutral-100 text-neutral-400 rounded-lg mb-4">
                    <i className="fas fa-plus text-xl"></i>
                  </div>
                  <h3 className="font-medium text-neutral-800 mb-1">Custom Template</h3>
                  <p className="text-sm text-neutral-500">
                    Create a new custom report template
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
