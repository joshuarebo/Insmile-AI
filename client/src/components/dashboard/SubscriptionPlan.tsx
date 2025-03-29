import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";

export default function SubscriptionPlan() {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-800">Subscription Plan</h2>
        <p className="text-sm text-neutral-500 mt-1">Your current plan and token usage</p>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 mr-3">
                <i className="fas fa-crown"></i>
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">Pro Plan</h3>
                <p className="text-sm text-neutral-500">$199/month, billed monthly</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-start">
                <i className="fas fa-check text-success mt-1 mr-2"></i>
                <span className="text-sm text-neutral-700">Unlimited patients</span>
              </div>
              <div className="flex items-start">
                <i className="fas fa-check text-success mt-1 mr-2"></i>
                <span className="text-sm text-neutral-700">10,000 AI tokens per month</span>
              </div>
              <div className="flex items-start">
                <i className="fas fa-check text-success mt-1 mr-2"></i>
                <span className="text-sm text-neutral-700">Unlimited treatment plans</span>
              </div>
              <div className="flex items-start">
                <i className="fas fa-check text-success mt-1 mr-2"></i>
                <span className="text-sm text-neutral-700">PDF export capabilities</span>
              </div>
              <div className="flex items-start">
                <i className="fas fa-check text-success mt-1 mr-2"></i>
                <span className="text-sm text-neutral-700">Email & phone support</span>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-6 w-full md:w-80">
            <h4 className="font-medium text-neutral-800 mb-4">Token Usage This Month</h4>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-700">{10000 - (user?.tokens || 0)} used</span>
                <span className="text-neutral-700">10,000 total</span>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className="bg-primary-500 h-full rounded-full" 
                  style={{ width: `${((10000 - (user?.tokens || 0)) / 10000) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-neutral-500 mb-6">
              <p>Renewal in 12 days: June 15, 2023</p>
            </div>
            
            <div className="space-y-3">
              <Link href="/billing">
                <Button className="w-full bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                  Upgrade Plan
                </Button>
              </Link>
              <Link href="/billing?tab=tokens">
                <Button className="w-full bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors">
                  Purchase Additional Tokens
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
