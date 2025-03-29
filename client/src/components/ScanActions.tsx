import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

interface ScanActionsProps {
  scan: {
    id: number;
    fileName: string;
    status: string;
  };
  onScanDeleted: () => void;
  onReportGenerated: () => void;
}

export default function ScanActions({ scan, onScanDeleted, onReportGenerated }: ScanActionsProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [dentistNotes, setDentistNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await apiRequest("DELETE", `/api/scans/${scan.id}`);
      toast({
        title: "Scan deleted",
        description: "The scan has been successfully deleted.",
      });
      onScanDeleted();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", `/api/scans/${scan.id}/report`, { dentistNotes });
      toast({
        title: "Report generated",
        description: "The report has been successfully generated.",
      });
      onReportGenerated();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsReportDialogOpen(false);
      setDentistNotes("");
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsReportDialogOpen(true)}
        disabled={scan.status !== "completed"}
      >
        <i className="fas fa-file-medical mr-2"></i>
        Generate Report
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDeleteDialogOpen(true)}
        className="text-red-600 hover:text-red-700"
      >
        <i className="fas fa-trash-alt mr-2"></i>
        Delete
      </Button>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the scan
              "{scan.fileName}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Add any additional notes to include in the report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add your notes here..."
              value={dentistNotes}
              onChange={(e) => setDentistNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Generating...
                </span>
              ) : (
                "Generate Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 