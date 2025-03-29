import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Patient } from "@/types";

const newPatientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  gender: z.enum(["male", "female", "other"]),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  status: z.enum(["active", "pending", "inactive"]).default("pending"),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  emergencyContact: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    relationship: z.string().min(2, "Relationship must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
  }),
  medicalHistory: z.object({
    conditions: z.array(z.object({
      name: z.string(),
      notes: z.string(),
      diagnosedDate: z.string().optional(),
    })).default([]),
    lastUpdated: z.string(),
  }).optional(),
  allergies: z.array(z.string()).default([]),
  currentMedications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    startDate: z.string().optional(),
  })).default([]),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string(),
    expirationDate: z.string().optional(),
  }).optional(),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    phone: z.boolean().default(false),
    preferredLanguage: z.string().default("English"),
  }),
});

type NewPatientFormValues = z.infer<typeof newPatientSchema>;

interface NewPatientFormProps {
  onSubmit: (data: NewPatientFormValues) => void;
  onCancel: () => void;
}

export function NewPatientForm({ onSubmit, onCancel }: NewPatientFormProps) {
  const [conditions, setConditions] = useState<Array<{ name: string; notes: string }>>([]);
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string }>>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  const form = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      status: "pending",
      riskLevel: "medium",
      communicationPreferences: {
        email: true,
        sms: false,
        phone: false,
        preferredLanguage: "English",
      },
      medicalHistory: {
        conditions: [],
        lastUpdated: new Date().toISOString(),
      },
      allergies: [],
      currentMedications: [],
    },
  });

  const addCondition = () => {
    setConditions([...conditions, { name: "", notes: "" }]);
  };

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "" }]);
  };

  const addAllergy = () => {
    setAllergies([...allergies, ""]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContact.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact.relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship</FormLabel>
                  <FormControl>
                    <Input placeholder="Spouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Medical Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Medical Information</h3>
          
          {/* Medical Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Medical Conditions</h4>
              <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                Add Condition
              </Button>
            </div>
            {conditions.map((_, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`medicalHistory.conditions.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Condition name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`medicalHistory.conditions.${index}.notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Allergies</h4>
              <Button type="button" variant="outline" size="sm" onClick={addAllergy}>
                Add Allergy
              </Button>
            </div>
            {allergies.map((_, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`allergies.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Enter allergy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          {/* Current Medications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Current Medications</h4>
              <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                Add Medication
              </Button>
            </div>
            {medications.map((_, index) => (
              <div key={index} className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`currentMedications.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Medication name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`currentMedications.${index}.dosage`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Dosage" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`currentMedications.${index}.frequency`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Frequency" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Insurance Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Insurance Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="insuranceInfo.provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="Provider name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceInfo.policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Policy number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceInfo.groupNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Group number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceInfo.expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Communication Preferences</h3>
          <div className="space-y-4">
            <div className="flex space-x-6">
              <FormField
                control={form.control}
                name="communicationPreferences.email"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Email</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="communicationPreferences.sms"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">SMS</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="communicationPreferences.phone"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Phone</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="communicationPreferences.preferredLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Patient
          </Button>
        </div>
      </form>
    </Form>
  );
} 