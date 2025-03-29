import { DashboardStats } from "@/lib/apiTypes";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsOverviewProps {
  stats?: DashboardStats;
  isLoading: boolean;
}

export default function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Patients Stat */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neutral-500 text-sm font-medium">Patients</h3>
          <span className="p-2 rounded-lg bg-primary-50 text-primary-500">
            <i className="fas fa-user-injured"></i>
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-16 mb-2" />
        ) : (
          <p className="text-2xl font-bold text-neutral-800">{stats?.totalPatients || 0}</p>
        )}
        <div className="flex items-center mt-2 text-sm">
          <span className="text-success flex items-center">
            <i className="fas fa-arrow-up mr-1"></i> 12%
          </span>
          <span className="text-neutral-500 ml-2">from last month</span>
        </div>
      </div>

      {/* AI Scans Stat */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neutral-500 text-sm font-medium">AI Scans</h3>
          <span className="p-2 rounded-lg bg-secondary-50 text-secondary-500">
            <i className="fas fa-brain"></i>
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-12 mb-2" />
        ) : (
          <p className="text-2xl font-bold text-neutral-800">{stats?.totalScans || 0}</p>
        )}
        <div className="flex items-center mt-2 text-sm">
          <span className="text-success flex items-center">
            <i className="fas fa-arrow-up mr-1"></i> 8%
          </span>
          <span className="text-neutral-500 ml-2">from last week</span>
        </div>
      </div>

      {/* Token Usage Stat */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neutral-500 text-sm font-medium">Token Usage</h3>
          <span className="p-2 rounded-lg bg-accent-50 text-accent-500">
            <i className="fas fa-coins"></i>
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <p className="text-2xl font-bold text-neutral-800">
            {stats?.tokensUsed?.toLocaleString() || "0"}
          </p>
        )}
        <div className="flex items-center mt-2 text-sm">
          <span className="text-error flex items-center">
            <i className="fas fa-arrow-up mr-1"></i> 18%
          </span>
          <span className="text-neutral-500 ml-2">increased usage</span>
        </div>
      </div>

      {/* Treatment Plans Stat */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neutral-500 text-sm font-medium">Treatment Plans</h3>
          <span className="p-2 rounded-lg bg-green-50 text-green-500">
            <i className="fas fa-clipboard-list"></i>
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-12 mb-2" />
        ) : (
          <p className="text-2xl font-bold text-neutral-800">{stats?.treatmentPlans || 0}</p>
        )}
        <div className="flex items-center mt-2 text-sm">
          <span className="text-success flex items-center">
            <i className="fas fa-check mr-1"></i> {stats?.completionRate || 0}%
          </span>
          <span className="text-neutral-500 ml-2">completion rate</span>
        </div>
      </div>
    </div>
  );
}
