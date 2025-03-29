import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import StatsOverview from "@/components/dashboard/StatsOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AIAnalysisDemo from "@/components/dashboard/AIAnalysisDemo";
import PatientManagement from "@/components/dashboard/PatientManagement";
import SubscriptionPlan from "@/components/dashboard/SubscriptionPlan";
import TreatmentPlanningFeatures from "@/components/dashboard/TreatmentPlanningFeatures";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/lib/apiTypes";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Fetch dashboard stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Dashboard Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
              <p className="text-neutral-500 mt-1">
                Welcome back, {user?.fullName}. Here's what's happening today.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <button className="bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-neutral-50">
                <i className="fas fa-bell"></i>
                <span className="hidden md:inline">Notifications</span>
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary-500 text-white rounded-full">3</span>
              </button>
              <button className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-600">
                <i className="fas fa-plus"></i>
                <span>New Patient</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Overview */}
          <StatsOverview stats={statsData} isLoading={isLoadingStats} />

          {/* Recent Activity and AI Analysis Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RecentActivity />
            <AIAnalysisDemo />
          </div>

          {/* Patient Management Section */}
          <PatientManagement />

          {/* Subscription Plan */}
          <SubscriptionPlan />

          {/* Treatment Planning Features */}
          <TreatmentPlanningFeatures />
        </div>
      </main>
    </div>
  );
}
