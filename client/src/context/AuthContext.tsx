import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/auth";

interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  clinicId: number;
  tokens: number;
  phone?: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  clinicId: number;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface RegisterResponse {
  message?: string;
  error?: string;
  user?: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await apiRequest("GET", "/auth/user");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/auth/login", credentials);
      const userData = await res.json();
      
      // Set user data first
      setUser(userData);
      
      // Show success toast
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.fullName}!`,
      });

      // Small delay to ensure state is updated before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then redirect
      navigate("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/auth/logout");
      setUser(null);
      navigate("/login");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/auth/register", userData);
      const data = await response.json() as RegisterResponse;
      
      if (data.error) {
        toast({
          title: "Registration failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Store registration success in session storage
      sessionStorage.setItem('registrationSuccess', 'true');

      toast({
        title: "Registration successful",
        description: data.message || "Your account has been created. You can now login.",
      });

      // Small delay to ensure toast is visible
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate("/login");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
