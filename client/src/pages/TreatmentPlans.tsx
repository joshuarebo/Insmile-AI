import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface TreatmentPlan {
  id: number;
  patientId: number;
  patientName: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  completionRate: number;
  createdAt: string;
  steps: {
    id: number;
    title: string;
    description: string;
    status: "pending" | "completed";
    dueDate?: string;
  }[];
  estimatedCost?: string;
  assignedDentist?: string;
  nextAppointment?: string;
}

export default function TreatmentPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewPlanDialogOpen, setIsNewPlanDialogOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery<TreatmentPlan[]>({
    queryKey: ["/api/treatment-plans"],
    queryFn: async () => {
      const res = await fetch("/api/treatment-plans", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch treatment plans");
      return res.json();
    },
  });

  const getStatusColor = (status: TreatmentPlan["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = 
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Treatment Plans</h1>
              <p className="text-neutral-500 mt-1">
                Manage and track patient treatment plans
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Dialog open={isNewPlanDialogOpen} onOpenChange={setIsNewPlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <i className="fas fa-plus mr-2"></i>
                    New Treatment Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Treatment Plan</DialogTitle>
                    <DialogDescription>
                      Create a new treatment plan for a patient
                    </DialogDescription>
                  </DialogHeader>
                  {/* Add form here */}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search treatment plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Treatment Plans Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-2xl text-primary-600"></i>
              <p className="text-neutral-600 mt-2">Loading treatment plans...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-neutral-100">
                <i className="fas fa-clipboard-list text-2xl text-neutral-400"></i>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-1">
                No treatment plans found
              </h3>
              <p className="text-neutral-500">
                Create your first treatment plan to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Patient: {plan.patientName}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(plan.status)}>
                        {plan.status.replace("_", " ").charAt(0).toUpperCase() + 
                         plan.status.slice(1).replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600">Progress</span>
                          <span className="text-neutral-900 font-medium">
                            {plan.completionRate}%
                          </span>
                        </div>
                        <Progress value={plan.completionRate} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        {plan.steps.slice(0, 3).map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center text-sm"
                          >
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              step.status === "completed" 
                                ? "bg-green-500" 
                                : "bg-neutral-300"
                            }`} />
                            <span className={step.status === "completed" 
                              ? "text-neutral-500 line-through" 
                              : "text-neutral-700"
                            }>
                              {step.title}
                            </span>
                          </div>
                        ))}
                        {plan.steps.length > 3 && (
                          <div className="text-sm text-neutral-500">
                            +{plan.steps.length - 3} more steps
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-neutral-200 space-y-2">
                        {plan.estimatedCost && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-600">Estimated Cost:</span>
                            <span className="text-neutral-900 font-medium">
                              {plan.estimatedCost}
                            </span>
                          </div>
                        )}
                        {plan.nextAppointment && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-600">Next Appointment:</span>
                            <span className="text-neutral-900">
                              {formatDate(plan.nextAppointment)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        <Button variant="outline" size="sm">
                          <i className="fas fa-edit mr-1"></i>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
