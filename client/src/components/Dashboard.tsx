import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types/common';
import { Button } from '@/components/ui/button';

export const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (err) {
        setError('Failed to fetch user data');
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      window.location.href = '/login';
    } catch (err) {
      setError('Failed to logout');
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Welcome, {user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
            <h2 className="text-2xl font-bold mb-4">Welcome to Insmile AI</h2>
            <p className="text-gray-600">
              This is your dashboard. You can manage your dental practice and patient records here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}; 