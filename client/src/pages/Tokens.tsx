import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Token packages
const tokenPackages = [
  { id: "small", tokens: 5000, price: 49, value: "Basic" },
  { id: "medium", tokens: 15000, price: 129, value: "Popular" },
  { id: "large", tokens: 50000, price: 399, value: "Best Value" }
];

export default function Tokens() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTokenPackage, setSelectedTokenPackage] = useState("medium");
  const [isProcessing, setIsProcessing] = useState(false);

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
              <h1 className="text-2xl font-bold text-neutral-800">AI Tokens</h1>
              <p className="text-neutral-500 mt-1">
                Manage your AI token balance and purchase additional tokens
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
                      <span className="text-neutral-700">{10000 - (user?.tokens || 0)} used</span>
                      <span className="text-neutral-700">10,000 total</span>
                    </div>
                    <Progress value={70.42} className="h-2" />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Token allocation refreshes in 12 days
                  </p>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-lg">
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
                        
                        <div className="mt-4">
                          <p className="text-2xl font-bold text-neutral-900">${pkg.price}</p>
                          <p className="text-sm text-neutral-500">One-time purchase</p>
                        </div>
                      </div>
                    ))}
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
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 