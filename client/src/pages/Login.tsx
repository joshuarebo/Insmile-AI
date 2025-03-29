import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/types/schema";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

export default function Login() {
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user just registered successfully
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    if (registrationSuccess) {
      // Clear the flag
      sessionStorage.removeItem('registrationSuccess');
      // Show welcome message
      toast({
        title: "Welcome to Insmile AI!",
        description: "Registration successful. Please log in with your credentials.",
      });
    }
  }, [toast]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      await login(data);
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
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
          <CardTitle className="text-xl">Login to your account</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            <p>
              Don't have an account?{" "}
              <Link href="/register">
                <a className="text-primary-600 hover:text-primary-700 font-medium">
                  Register
                </a>
              </Link>
            </p>
          </div>
          
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
        </CardFooter>
      </Card>
    </div>
  );
}
