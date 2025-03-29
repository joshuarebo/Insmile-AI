import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import Logo from "@/components/Logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isMobile]);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  const MenuItem = ({ href, icon, label, active, badge }: { href: string; icon: string; label: string; active: boolean; badge?: string | number }) => (
    <li>
      <Link href={href}>
        <a
          className={cn(
            "flex items-center justify-between p-3 rounded-lg transition-colors",
            active
              ? "bg-primary-50 text-primary-700 font-medium"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <div className="flex items-center space-x-3">
            <i className={`fas ${icon} w-5 text-center`}></i>
            <span>{label}</span>
          </div>
          {badge && (
            <span className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              typeof badge === 'number' && badge > 0
                ? "bg-primary-100 text-primary-700"
                : "bg-neutral-100 text-neutral-600"
            )}>
              {badge}
            </span>
          )}
        </a>
      </Link>
    </li>
  );

  const menuItems = [
    {
      title: "Dashboard",
      icon: "fas fa-chart-line",
      href: "/",
    },
    {
      title: "Patients",
      icon: "fas fa-user-injured",
      href: "/patients",
    },
    {
      title: "Scans",
      icon: "fas fa-x-ray",
      href: "/scans",
    },
    {
      title: "AI Analysis",
      icon: "fas fa-brain",
      href: "/ai-analysis",
    },
    {
      title: "Treatment Plans",
      icon: "fas fa-clipboard-list",
      href: "/treatment-plans",
    },
    {
      title: "Reports",
      icon: "fas fa-file-medical-alt",
      href: "/reports",
    },
    {
      title: "AI Tokens",
      icon: "fas fa-coins",
      href: "/tokens",
    },
  ];

  const bottomMenuItems = [
    {
      title: "Settings",
      icon: "fas fa-cog",
      href: "/settings",
    },
    {
      title: "Billing",
      icon: "fas fa-credit-card",
      href: "/billing",
    },
  ];

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <header className="lg:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
          <Logo size="md" />
          <button
            onClick={toggleSidebar}
            className="text-neutral-600 focus:outline-none"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </header>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col w-64 bg-white border-r border-neutral-200 h-full transition-all",
          isMobile && !isOpen ? "hidden" : "flex",
          isMobile && "fixed z-50 top-0 left-0 h-screen shadow-lg",
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-neutral-200">
          <Logo size="xl" />
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        location === item.href
                          ? "bg-primary-50 text-primary-600"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      <i className={cn(item.icon, "w-5 h-5 mr-3")} />
                      {item.title}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Menu */}
        <div className="p-4 border-t border-neutral-200">
          <ul className="space-y-1">
            {bottomMenuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location === item.href
                        ? "bg-primary-50 text-primary-600"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <i className={cn(item.icon, "w-5 h-5 mr-3")} />
                    {item.title}
                  </a>
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={logout}
                className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <i className="fas fa-sign-out-alt w-5 h-5 mr-3" />
                Logout
              </button>
            </li>
          </ul>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.fullName?.charAt(0) || "U"}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">{user?.fullName}</p>
              <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}
