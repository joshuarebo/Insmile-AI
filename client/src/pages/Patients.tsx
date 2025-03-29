import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Form schema for adding a new patient
const newPatientSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number must be at least 6 characters"),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalHistory: z.array(z.object({
    condition: z.string(),
    diagnosedDate: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  allergies: z.array(z.string()).default([]),
  currentMedications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string()
  })).default([]),
  status: z.string(),
  assignedDentist: z.number().optional(),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    groupNumber: z.string().optional(),
    expiryDate: z.string().optional()
  }).default({}),
  notes: z.string().optional(),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    phone: z.boolean().default(true),
    sms: z.boolean().default(false)
  }).default({ email: true, phone: true, sms: false }),
  riskLevel: z.string().default("medium")
});

type NewPatientFormValues = z.infer<typeof newPatientSchema>;

// Calculate age from date of birth
const calculateAge = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function Patients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 10;

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Filter patients based on search term
  const filteredPatients = patients?.filter(patient => 
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = filteredPatients ? Math.ceil(filteredPatients.length / patientsPerPage) : 0;
  const paginatedPatients = filteredPatients?.slice(
    (currentPage - 1) * patientsPerPage,
    currentPage * patientsPerPage
  );

  // Form for new patient
  const form = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phone: "",
      address: "",
      emergencyContact: "",
      medicalHistory: [],
      allergies: [],
      currentMedications: [],
      status: "active",
      assignedDentist: undefined,
      insuranceInfo: {},
      notes: "",
      communicationPreferences: {
        email: true,
        phone: true,
        sms: false
      },
      riskLevel: "medium"
    },
  });

  const onSubmit = async (data: NewPatientFormValues) => {
    try {
      // Generate a unique patient ID with format PAT-XXXXX
      const patientId = `PAT-${10000 + Math.floor(Math.random() * 90000)}`;
      
      await apiRequest("POST", "/api/patients", {
        ...data,
        patientId,
        clinicId: user?.clinicId
      });
      
      // Invalidate patients query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({
        title: "Success",
        description: `Patient ${data.fullName} has been added successfully`,
      });
      
      setIsNewPatientDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add patient",
        variant: "destructive",
      });
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
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

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Patients</h1>
              <p className="text-neutral-500 mt-1">
                Manage your patient records and treatment plans
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <Button onClick={() => setIsNewPatientDialogOpen(true)} className="bg-primary-500 text-white hover:bg-primary-600">
                <i className="fas fa-plus mr-2"></i>
                <span>Add New Patient</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Patient Management */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">All Patients</h2>
              <div className="mt-4 sm:mt-0 flex">
                <div className="relative">
                  <Input
                    name="search"
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
                <Button variant="outline" className="ml-3">
                  <i className="fas fa-filter mr-2"></i>Filter
                </Button>
              </div>
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Patient ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Next Steps
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {isLoading ? (
                    // Loading state with 5 rows
                    Array(5).fill(0).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-neutral-200"></div>
                            <div className="ml-4">
                              <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                              <div className="h-3 w-16 bg-neutral-200 rounded mt-2"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-20 bg-neutral-200 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 w-24 bg-neutral-200 rounded-full"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 w-16 bg-neutral-200 rounded-full"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-24 bg-neutral-200 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <div className="h-6 w-6 bg-neutral-200 rounded-full"></div>
                            <div className="h-6 w-6 bg-neutral-200 rounded-full"></div>
                            <div className="h-6 w-6 bg-neutral-200 rounded-full"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedPatients?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-neutral-500">
                        {searchTerm ? "No patients found matching your search criteria" : "No patients found. Add your first patient!"}
                      </td>
                    </tr>
                  ) : (
                    paginatedPatients?.map((patient) => (
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
                                {calculateAge(patient.dateOfBirth)} years • {patient.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900">
                            {patient.patientId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-600">
                            <div className="flex items-center">
                              <i className="fas fa-envelope text-xs mr-1"></i>
                              {patient.email}
                            </div>
                            <div className="flex items-center mt-1">
                              <i className="fas fa-phone text-xs mr-1"></i>
                              {patient.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(patient.status)}`}>
                            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                            {patient.status === 'active' ? ' Treatment' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            patient.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                            patient.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {patient.riskLevel?.charAt(0).toUpperCase() + patient.riskLevel?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {formatDate(patient.lastVisit)}
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
                              <i className="fas fa-calendar-alt mr-1"></i> {patient.nextSteps}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary-500 hover:text-primary-700">
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700">
                              <i className="fas fa-ellipsis-v"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center text-sm text-neutral-700">
                <span>
                  Showing <strong>{((currentPage - 1) * patientsPerPage) + 1}-{Math.min(currentPage * patientsPerPage, filteredPatients?.length || 0)}</strong> of{" "}
                  <strong>{filteredPatients?.length || 0}</strong> patients
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
                
                {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
                  const pageNumber = currentPage <= 2 ? index + 1 : currentPage - 1 + index;
                  if (pageNumber <= totalPages) {
                    return (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }
                  return null;
                })}
                
                {totalPages > 3 && currentPage < totalPages - 1 && (
                  <span className="text-neutral-500">...</span>
                )}
                
                {totalPages > 3 && currentPage < totalPages && (
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <i className="fas fa-chevron-right"></i>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* New Patient Dialog */}
      <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>
              Enter the patient details to add them to your clinic
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient's full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active Treatment</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter patient's email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient's phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient's address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Name and phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Medical Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="medicalHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical History</FormLabel>
                        <div className="space-y-2">
                          {field.value.map((condition, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                name="condition"
                                placeholder="Enter condition"
                                value={condition.condition}
                                onChange={(e) => {
                                  const newValue = [...field.value];
                                  newValue[index].condition = e.target.value;
                                  field.onChange(newValue);
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newValue = field.value.filter((_, i) => i !== index);
                                  field.onChange(newValue);
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange([...field.value, { condition: "", diagnosedDate: "", notes: "" }]);
                            }}
                          >
                            <i className="fas fa-plus mr-2"></i> Add Condition
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergies</FormLabel>
                        <div className="space-y-2">
                          {field.value.map((allergy, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                name="allergy"
                                placeholder="Enter allergy"
                                value={allergy}
                                onChange={(e) => {
                                  const newValue = [...field.value];
                                  newValue[index] = e.target.value;
                                  field.onChange(newValue);
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newValue = field.value.filter((_, i) => i !== index);
                                  field.onChange(newValue);
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange([...field.value, ""]);
                            }}
                          >
                            <i className="fas fa-plus mr-2"></i> Add Allergy
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentMedications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <div className="space-y-2">
                          {field.value.map((medication, index) => (
                            <div key={index} className="grid grid-cols-3 gap-2">
                              <Input
                                name="medication"
                                placeholder="Enter medication"
                                value={medication.name}
                                onChange={(e) => {
                                  const newValue = [...field.value];
                                  newValue[index] = { ...medication, name: e.target.value };
                                  field.onChange(newValue);
                                }}
                              />
                              <Input
                                placeholder="Dosage"
                                value={medication.dosage}
                                onChange={(e) => {
                                  const newValue = [...field.value];
                                  newValue[index] = { ...medication, dosage: e.target.value };
                                  field.onChange(newValue);
                                }}
                              />
                              <div className="flex items-center space-x-2">
                                <Input
                                  placeholder="Frequency"
                                  value={medication.frequency}
                                  onChange={(e) => {
                                    const newValue = [...field.value];
                                    newValue[index] = { ...medication, frequency: e.target.value };
                                    field.onChange(newValue);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newValue = field.value.filter((_, i) => i !== index);
                                    field.onChange(newValue);
                                  }}
                                >
                                  <i className="fas fa-times"></i>
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange([...field.value, { name: "", dosage: "", frequency: "" }]);
                            }}
                          >
                            <i className="fas fa-plus mr-2"></i> Add Medication
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignedDentist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Dentist</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select dentist" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* We'll need to fetch dentists from the API */}
                            <SelectItem value="1">Dr. John Smith</SelectItem>
                            <SelectItem value="2">Dr. Emily Chen</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes about the patient"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Communication Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Communication Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="communicationPreferences.email"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Email</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="communicationPreferences.phone"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Phone</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="communicationPreferences.sms"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">SMS</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewPatientDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Patient</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
