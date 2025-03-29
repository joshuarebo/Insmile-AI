import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { debounce } from "lodash";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScanActions from "@/components/ScanActions";

interface Patient {
  id: number;
  fullName: string;
}

interface Scan {
  id: number;
  patientId: number;
  patientName: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

type ScanStatus = Scan["status"];

export default function Scans() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScanStatus | "all">("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch scans with search and filter
  const { data: scans = [], isLoading } = useQuery<Scan[]>({
    queryKey: ["/api/scans", { search: searchTerm, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const res = await fetch(`/api/scans?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch scans");
      return res.json();
    },
  });

  // Fetch patients for the select dropdown
  const { data: patients = [], error: patientsError } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Format date helper
  const formatDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  // Upload mutation
  const uploadMutation = useMutation<Scan[], Error, File[]>({
    mutationFn: async (files) => {
      if (!selectedPatient) {
        throw new Error("Please select a patient");
      }

      const formData = new FormData();
      formData.append("patientId", selectedPatient);
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/scans/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      setIsUploadOpen(false);
      setSelectedPatient("");
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (files: File[]) => {
    await uploadMutation.mutateAsync(files);
  };

  const handleScanDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
  };

  const handleReportGenerated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
  };

  const getStatusClass = (status: ScanStatus) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "processing":
        return "text-blue-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
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
              <h1 className="text-2xl font-bold text-neutral-800">Dental Scans</h1>
              <p className="text-neutral-500 mt-1">
                Manage and analyze your dental scans
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <i className="fas fa-plus mr-2" aria-hidden="true" />
                    Upload Scans
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Dental Scans</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">
                        Select Patient
                      </label>
                      <Select
                        value={selectedPatient}
                        onValueChange={setSelectedPatient}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient: Patient) => (
                            <SelectItem key={patient.id} value={String(patient.id)}>
                              {patient.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FileUpload onUpload={handleUpload} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Search Patient
                </label>
                <Input
                  name="search"
                  type="text"
                  placeholder="Search by patient name or scan ID..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Filter by Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Scans Table */}
          <div className="bg-white rounded-lg border border-neutral-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <i className="fas fa-spinner fa-spin text-2xl text-primary-600"></i>
                      <p className="text-neutral-600 mt-2">Loading scans...</p>
                    </TableCell>
                  </TableRow>
                ) : scans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-neutral-600">No scans found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  scans.map((scan: any) => (
                    <TableRow key={scan.id}>
                      <TableCell>{scan.patientName}</TableCell>
                      <TableCell>{scan.fileName}</TableCell>
                      <TableCell>{formatDate(scan.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                            scan.status
                          )}`}
                        >
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ScanActions
                          scan={scan}
                          onScanDeleted={handleScanDeleted}
                          onReportGenerated={handleReportGenerated}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
} 