import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// Pricing plans
const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    description: "For small practices just getting started",
    features: [
      "5 active patients",
      "3 treatment plans per month",
      "5,000 AI tokens per month",
      "Basic reports",
      "Email support"
    ],
    recommended: false
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    description: "Perfect for established dental practices",
    features: [
      "Unlimited patients",
      "Unlimited treatment plans",
      "10,000 AI tokens per month",
      "Advanced reports & analytics",
      "Priority email & phone support",
      "API access"
    ],
    recommended: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    description: "For dental clinics with multiple dentists",
    features: [
      "Everything in Pro",
      "50,000 AI tokens per month",
      "Multiple dentist accounts",
      "Custom AI model training",
      "Dedicated account manager",
      "24/7 priority support"
    ],
    recommended: false
  }
];

// Token packages
const tokenPackages = [
  { id: "small", tokens: 5000, price: 49, value: "Basic" },
  { id: "medium", tokens: 15000, price: 129, value: "Popular" },
  { id: "large", tokens: 50000, price: 399, value: "Best Value" }
];

// Invoice data
const invoices = [
  { id: "INV-001", date: "May 1, 2023", amount: 199, status: "Paid" },
  { id: "INV-002", date: "Apr 1, 2023", amount: 199, status: "Paid" },
  { id: "INV-003", date: "Mar 1, 2023", amount: 199, status: "Paid" },
  { id: "INV-004", date: "Feb 1, 2023", amount: 99, status: "Paid" },
  { id: "INV-005", date: "Jan 1, 2023", amount: 99, status: "Paid" }
];

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedTokenPackage, setSelectedTokenPackage] = useState("medium");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgradePlan = () => {
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Plan Updated",
        description: `You've successfully upgraded to the ${selectedPlan.toUpperCase()} plan.`,
      });
      setIsProcessing(false);
    }, 1500);
  };

  const handlePurchaseTokens = () => {
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const package_ = tokenPackages.find(pkg => pkg.id === selectedTokenPackage);
      toast({
        title: "Tokens Purchased",
        description: `${package_?.tokens.toLocaleString()} tokens have been added to your account.`,
      });
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Billing & Subscription</h1>
              <p className="text-neutral-500 mt-1">
                Manage your subscription, AI tokens, and payment methods
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex items-center space-x-2 bg-neutral-100 px-3 py-2 rounded-lg">
                <i className="fas fa-coins text-accent-500"></i>
                <span className="text-sm text-neutral-700">
                  <strong>{user?.tokens.toLocaleString()}</strong> tokens remaining
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="subscription" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="tokens">AI Tokens</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payment">Payment Methods</TabsTrigger>
            </TabsList>
            
            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your subscription details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 mr-3">
                          <i className="fas fa-crown"></i>
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-800">Pro Plan</h3>
                          <p className="text-sm text-neutral-500">$199/month</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-neutral-700">
                        <div className="flex items-center justify-between mb-1">
                          <span>Next billing date:</span>
                          <span className="font-medium">June 15, 2023</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span>Billing cycle:</span>
                          <span className="font-medium">Monthly</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span>Status:</span>
                          <span className="font-medium text-green-600">Active</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-neutral-800 mb-2">Token Usage</h4>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-700">7,042 used</span>
                          <span className="text-neutral-700">10,000 total</span>
                        </div>
                        <Progress value={70.42} className="h-2" />
                      </div>
                      <p className="text-xs text-neutral-500">
                        Token usage resets on your billing date (June 15, 2023)
                      </p>
                    </div>
                    
                    <div className="border-t border-neutral-200 pt-4 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        <i className="fas fa-file-invoice-dollar mr-2"></i> View Billing History
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <i className="fas fa-ban mr-2"></i> Cancel Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Choose a Plan</CardTitle>
                    <CardDescription>Select the best plan for your practice</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end mb-4">
                      <div className="flex items-center space-x-2 bg-neutral-100 p-1 px-2 rounded-full">
                        <span 
                          className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                            billingCycle === "monthly" ? "bg-white shadow-sm" : "text-neutral-500"
                          }`}
                          onClick={() => setBillingCycle("monthly")}
                        >
                          Monthly
                        </span>
                        <span 
                          className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                            billingCycle === "annual" ? "bg-white shadow-sm" : "text-neutral-500"
                          }`}
                          onClick={() => setBillingCycle("annual")}
                        >
                          Annual <span className="text-green-600">-15%</span>
                        </span>
                      </div>
                    </div>
                    
                    <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {pricingPlans.map(plan => (
                          <div 
                            key={plan.id}
                            className={`border rounded-lg p-4 relative ${
                              selectedPlan === plan.id ? "border-primary-500 bg-primary-50" : "border-neutral-200"
                            } ${plan.recommended ? "ring-2 ring-primary-500" : ""}`}
                          >
                            {plan.recommended && (
                              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                <span className="bg-primary-500 text-white text-xs px-3 py-1 rounded-full">
                                  Recommended
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-neutral-800 mb-1">{plan.name}</h3>
                                <p className="text-neutral-500 text-sm mb-2">{plan.description}</p>
                              </div>
                              <RadioGroupItem value={plan.id} className="mt-1" />
                            </div>
                            
                            <div className="text-2xl font-bold text-neutral-900 mt-2 mb-3">
                              ${billingCycle === "annual" ? Math.round(plan.price * 0.85) : plan.price}
                              <span className="text-sm font-normal text-neutral-500">/{billingCycle === "annual" ? "mo" : "month"}</span>
                            </div>
                            
                            <ul className="space-y-2 mb-4">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                  <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                                  <span className="text-sm text-neutral-700">{feature}</span>
                                </li>
                              ))}
                            </ul>
                            
                            {user && plan.id === "pro" && (
                              <div className="bg-green-50 text-green-700 text-xs p-2 rounded">
                                <i className="fas fa-check-circle mr-1"></i> Current Plan
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={handleUpgradePlan} 
                      disabled={isProcessing || (user && selectedPlan === "pro")}
                    >
                      {isProcessing ? (
                        <span className="flex items-center">
                          <i className="fas fa-spinner fa-spin mr-2"></i> Processing...
                        </span>
                      ) : user && selectedPlan === "pro" ? (
                        "Current Plan"
                      ) : (
                        <>Upgrade to {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            {/* AI Tokens Tab */}
            <TabsContent value="tokens">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Token Usage</CardTitle>
                    <CardDescription>Monitor your AI token consumption</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Available Tokens</h3>
                      <div className="text-3xl font-bold text-primary-600 mb-3">
                        {user?.tokens.toLocaleString()}
                      </div>
                      
                      <p className="text-sm text-neutral-500 mb-2">Monthly token allocation</p>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-700">7,042 used</span>
                          <span className="text-neutral-700">10,000 total</span>
                        </div>
                        <Progress value={70.42} className="h-2" />
                      </div>
                      <p className="text-xs text-neutral-500">
                        Token allocation refreshes in 12 days
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-neutral-800 mb-2">What are tokens?</h4>
                      <p className="text-sm text-neutral-600 mb-4">
                        Tokens are the units used by our AI to process dental scans. Each scan analysis consumes a varying number of tokens based on complexity.
                      </p>
                      <p className="text-sm text-neutral-600">
                        A typical CBCT scan analysis uses approximately 80,000-120,000 tokens, while a simple X-ray analysis uses 20,000-40,000 tokens.
                      </p>
                    </div>
                    
                    <div className="border-t border-neutral-200 pt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        <i className="fas fa-chart-line mr-2"></i> View Usage History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Purchase Additional Tokens</CardTitle>
                    <CardDescription>
                      Need more AI processing power? Add more tokens to your account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedTokenPackage} onValueChange={setSelectedTokenPackage}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {tokenPackages.map(pkg => (
                          <div 
                            key={pkg.id}
                            className={`border rounded-lg p-4 relative ${
                              selectedTokenPackage === pkg.id ? "border-primary-500 bg-primary-50" : "border-neutral-200"
                            } ${pkg.value === "Popular" ? "ring-2 ring-primary-500" : ""}`}
                          >
                            {pkg.value === "Popular" && (
                              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                <span className="bg-primary-500 text-white text-xs px-3 py-1 rounded-full">
                                  Most Popular
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-neutral-800 mb-1">{pkg.tokens.toLocaleString()} Tokens</h3>
                                <p className="text-neutral-500 text-sm">{pkg.value}</p>
                              </div>
                              <RadioGroupItem value={pkg.id} className="mt-1" />
                            </div>
                            
                            <div className="text-2xl font-bold text-neutral-900 mt-3 mb-2">
                              ${pkg.price}
                            </div>
                            
                            <p className="text-sm text-neutral-600 mb-3">
                              <span className="text-primary-600 font-medium">
                                ${(pkg.price / pkg.tokens * 1000).toFixed(2)}
                              </span> per 1,000 tokens
                            </p>
                            
                            <div className="text-sm text-neutral-600">
                              <p>Approximately:</p>
                              <ul className="space-y-1 mt-1">
                                <li className="flex items-start">
                                  <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                                  <span>{Math.round(pkg.tokens / 100000)} CBCT scan{Math.round(pkg.tokens / 100000) !== 1 ? "s" : ""}</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                                  <span>{Math.round(pkg.tokens / 30000)} X-ray scan{Math.round(pkg.tokens / 30000) !== 1 ? "s" : ""}</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                    
                    <div className="border-t border-neutral-200 pt-6">
                      <h3 className="font-medium text-neutral-800 mb-4">Payment Method</h3>
                      <div className="bg-neutral-50 p-4 rounded-lg mb-6">
                        <div className="flex items-center">
                          <div className="mr-3 text-neutral-400">
                            <i className="fab fa-cc-visa text-xl"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">Visa ending in 4242</p>
                            <p className="text-xs text-neutral-500">Expires 12/2025</p>
                          </div>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            Change
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-6">
                        <Switch id="save-card" />
                        <Label htmlFor="save-card">Save this card for future purchases</Label>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-neutral-200 pt-4">
                        <div>
                          <p className="text-sm text-neutral-500">Total amount:</p>
                          <p className="text-xl font-bold text-neutral-900">
                            ${tokenPackages.find(pkg => pkg.id === selectedTokenPackage)?.price}
                          </p>
                        </div>
                        <Button 
                          onClick={handlePurchaseTokens} 
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <span className="flex items-center">
                              <i className="fas fa-spinner fa-spin mr-2"></i> Processing...
                            </span>
                          ) : (
                            "Purchase Tokens"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View and download your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Invoice</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-neutral-900">{invoice.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-neutral-500">{invoice.date}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-neutral-900">${invoice.amount}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <i className="fas fa-download"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm text-neutral-500">Showing 5 of 5 invoices</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      <i className="fas fa-chevron-left mr-2"></i> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next <i className="fas fa-chevron-right ml-2"></i>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Payment Methods Tab */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your payment methods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 flex items-center">
                      <div className="mr-3 text-neutral-400">
                        <i className="fab fa-cc-visa text-2xl"></i>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">Visa ending in 4242</p>
                        <p className="text-sm text-neutral-500">Expires 12/2025</p>
                      </div>
                      <div className="flex items-center ml-auto">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-3">
                          Default
                        </span>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-500">
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-dashed rounded-lg p-6 text-center">
                      <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                        <i className="fas fa-credit-card text-xl"></i>
                      </div>
                      <h3 className="font-medium text-neutral-700 mb-2">Add a new payment method</h3>
                      <p className="text-sm text-neutral-500 mb-4">
                        Add a new credit card or debit card to your account
                      </p>
                      <Button variant="outline">
                        <i className="fas fa-plus mr-2"></i> Add Payment Method
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-neutral-200">
                    <h3 className="font-medium text-neutral-800 mb-4">Billing Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                            value="Dr. Emily Chen"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                            value="admin@insmileai.com"
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Billing Address
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                          value="123 Main Street, Suite 100"
                          readOnly
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                            value="Anytown"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            State/Province
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                            value="CA"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                            value="12345"
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button>
                          Edit Billing Information
                        </Button>
                      </div>
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
