import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelativeTime } from "@/lib/auth";
import { ActivityWithDetails } from "@/lib/apiTypes";

interface Activity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  entityInfo?: {
    name: string;
    type: string;
  };
}

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities?limit=4"],
  });

  const getIconForAction = (action: string) => {
    switch (action) {
      case "scan_upload":
      case "scan_delete":
        return "bg-blue-100 text-blue-600";
      case "analysis_create":
      case "analysis_update":
        return "bg-purple-100 text-purple-600";
      case "treatment_create":
      case "treatment_update":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getIconClass = (action: string) => {
    switch (action) {
      case "scan_upload":
      case "scan_delete":
        return "fa-tooth";
      case "analysis_create":
      case "analysis_update":
        return "fa-brain";
      case "treatment_create":
      case "treatment_update":
        return "fa-file-medical";
      default:
        return "fa-circle";
    }
  };

  const getActionDescription = (activity: ActivityWithDetails) => {
    let entityName = "Unknown";
    if (activity.entityInfo) {
      entityName = activity.entityInfo.fullName || activity.entityInfo.fileName || `#${activity.entityId}`;
    }
    
    return activity.description?.replace("patient", entityName) || "Activity recorded";
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
      </div>
      <ul className="divide-y divide-gray-200">
        {isLoading ? (
          // Loading skeletons
          Array(4).fill(0).map((_, index) => (
            <li key={index} className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </li>
          ))
        ) : (
          activities?.map((activity: ActivityWithDetails) => (
            <li key={activity.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconForAction(activity?.action || '')}`}>
                    <i className={`fas ${getIconClass(activity?.action || '')}`}></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity?.description || 'Unknown activity'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity?.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                  </p>
                </div>
              </div>
            </li>
          ))
        )}

        {!isLoading && (!activities || activities.length === 0) && (
          <li className="p-4 text-center text-gray-500">
            <p>No recent activities to display</p>
          </li>
        )}
      </ul>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          View all activity →
        </a>
      </div>
    </div>
  );
}
