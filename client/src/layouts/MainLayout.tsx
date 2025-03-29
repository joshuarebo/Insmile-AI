import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/' },
    { name: 'Patients', path: '/patients' },
    { name: 'Scans', path: '/scans' },
    { name: 'Treatment Plans', path: '/treatment-plans' },
    { name: 'Chat Assistant', path: '/chat' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-blue-600">Insmile AI</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {user?.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.clinicName}</p>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {navigation.find(item => item.path === location.pathname)?.name}
            </h2>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 