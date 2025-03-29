import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema for login form
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for registration form
const registerSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
  role: z.string(),
  clinicId: z.coerce.number().default(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface AuthFormProps {
  type: "login" | "register";
}

export default function AuthForm({ type }: AuthFormProps) {
  const { login, register: registerUser, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "dentist",
      clinicId: 1,
    },
  });

  // Login form submission
  const onLoginSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      await login(data);
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
    }
  };

  // Register form submission
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setError(null);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = data;
      await registerUser(userData);
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <img
              src="https://images.unsplash.com/photo-1609840112990-4265448268d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=64&h=64"
              alt="Insmile AI Logo"
              className="w-16 h-16 rounded-lg mr-4"
            />
            <h1 className="text-2xl font-bold text-primary-600">Insmile AI</h1>
          </div>
          <CardTitle className="text-xl">
            {type === "login" ? "Login to your account" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {type === "login"
              ? "Enter your credentials to access the dashboard"
              : "Register to access Insmile AI's dental treatment planning system"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {type === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i> Logging in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dentist">Dentist</SelectItem>
                          <SelectItem value="admin">Clinic Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i> Registering...
                    </span>
                  ) : (
                    "Register"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            {type === "login" ? (
              <p>
                Don't have an account?{" "}
                <Link href="/register">
                  <a className="text-primary-600 hover:text-primary-700 font-medium">
                    Register
                  </a>
                </Link>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <Link href="/login">
                  <a className="text-primary-600 hover:text-primary-700 font-medium">
                    Sign in
                  </a>
                </Link>
              </p>
            )}
          </div>
          
          {type === "login" && (
            <div className="w-full p-3 rounded-md bg-neutral-50 text-neutral-700 text-sm">
              <p className="text-center font-medium mb-2">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border rounded-md">
                  <p className="font-semibold">Admin:</p>
                  <p>Username: admin</p>
                  <p>Password: admin123</p>
                </div>
                <div className="p-2 border rounded-md">
                  <p className="font-semibold">Dentist:</p>
                  <p>Username: dentist</p>
                  <p>Password: dentist123</p>
                </div>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
