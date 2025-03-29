import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

// Security form schema
const securitySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Notification settings schema
const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  newPatientAlerts: z.boolean().default(true),
  treatmentUpdates: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  // Security form
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      newPatientAlerts: true,
      treatmentUpdates: true,
      securityAlerts: true,
      marketingEmails: false,
    },
  });

  // Handle profile update
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSaving(true);
      // TODO: Implement profile update
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle security update
  const onSecuritySubmit = async (data: SecurityFormValues) => {
    try {
      setIsSaving(true);
      // TODO: Implement security settings update
      toast({
        title: 'Success',
        description: 'Security settings updated successfully',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update security settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notification update
  const onNotificationSubmit = async (data: NotificationFormValues) => {
    try {
      setIsSaving(true);
      // TODO: Implement notification settings update
      toast({
        title: 'Success',
        description: 'Notification settings updated successfully',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update notification settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Settings</h1>
              <p className="text-neutral-500 mt-1">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="clinic">Clinic Settings</TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 mr-4">
                            <i className="fas fa-user text-xl"></i>
                          </div>
                          <div>
                            <Button variant="outline" size="sm" className="mb-1">
                              <i className="fas fa-upload mr-2"></i> Upload Photo
                            </Button>
                            <p className="text-xs text-neutral-500">
                              JPG, GIF or PNG. 1MB max.
                            </p>
                          </div>
                        </div>
                        
                        <FormField
                          control={profileForm.control}
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
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your email address" type="email" {...field} />
                              </FormControl>
                              <FormDescription>
                                This email will be used for notifications and communications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <span className="flex items-center">
                              <i className="fas fa-spinner fa-spin mr-2"></i> Saving...
                            </span>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={securityForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your current password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={securityForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your new password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 6 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={securityForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm your new password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <span className="flex items-center">
                              <i className="fas fa-spinner fa-spin mr-2"></i> Updating...
                            </span>
                          ) : (
                            "Update Password"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                  
                  <div className="border-t border-neutral-200 mt-8 pt-8">
                    <h3 className="text-lg font-medium text-neutral-800 mb-4">Two-Factor Authentication</h3>
                    <p className="text-neutral-500 mb-4">
                      Add an extra layer of security to your account by enabling two-factor authentication.
                    </p>
                    <Button variant="outline">
                      <i className="fas fa-shield-alt mr-2"></i> Enable 2FA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how and when you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive email notifications for important updates
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="newPatientAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">New Patient Alerts</FormLabel>
                              <FormDescription>
                                Get notified when new patients are added to your clinic
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="treatmentUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Treatment Updates</FormLabel>
                              <FormDescription>
                                Receive notifications about treatment progress and milestones
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="securityAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Security Alerts</FormLabel>
                              <FormDescription>
                                Get important security notifications about your account
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="marketingEmails"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Marketing Emails</FormLabel>
                              <FormDescription>
                                Receive updates about new features, promotions, and events
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <span className="flex items-center">
                              <i className="fas fa-spinner fa-spin mr-2"></i> Saving...
                            </span>
                          ) : (
                            "Save Preferences"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Clinic Settings Tab */}
            <TabsContent value="clinic">
              <Card>
                <CardHeader>
                  <CardTitle>Clinic Settings</CardTitle>
                  <CardDescription>
                    Manage your clinic information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-neutral-800">Clinic Information</h3>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Clinic Name</label>
                        <Input
                          name="clinicName"
                          defaultValue="Sunshine Dental Clinic"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Address</label>
                        <Input
                          name="address"
                          defaultValue="123 Main Street, Suite 100"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-neutral-700">City</label>
                          <Input
                            name="city"
                            defaultValue="Anytown"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-neutral-700">State/Province</label>
                          <Input
                            name="state"
                            defaultValue="CA"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-neutral-700">Postal Code</label>
                          <Input
                            name="zipCode"
                            defaultValue="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-neutral-700">Country</label>
                          <Input
                            name="country"
                            defaultValue="United States"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Phone</label>
                        <Input
                          name="phone"
                          defaultValue="555-123-4567"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Email</label>
                        <Input
                          name="email"
                          type="email"
                          defaultValue="info@sunshinedental.com"
                        />
                      </div>
                    </div>
                    
                    <div className="border-t border-neutral-200 pt-6">
                      <h3 className="text-lg font-medium text-neutral-800 mb-4">Clinic Branding</h3>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-24 h-24 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-500">
                          <i className="fas fa-hospital text-3xl"></i>
                        </div>
                        <div>
                          <Button variant="outline" size="sm" className="mb-1">
                            <i className="fas fa-upload mr-2"></i> Upload Logo
                          </Button>
                          <p className="text-xs text-neutral-500">
                            Recommended size: 200x200 pixels
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">Clinic Description</label>
                        <textarea 
                          className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          placeholder="Enter a short description of your clinic"
                          defaultValue="Sunshine Dental Clinic offers comprehensive dental care with a focus on patient comfort and cutting-edge technology."
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="button">
                        Save Clinic Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
