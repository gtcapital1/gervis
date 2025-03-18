import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Star, Zap, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  userId,
}: UpgradeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upgrade to Gervis PRO mutation
  const upgradeMutation = useMutation({
    mutationFn: () => {
      return apiRequest(`/api/users/${userId}/upgrade`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Upgraded to Gervis PRO",
        description: "Your account has been successfully upgraded to Gervis PRO!",
      });
      // Invalidate user query to refresh UI with Watson PRO status
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Upgrade failed",
        description: "There was a problem upgrading your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    upgradeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Star className="mr-2 h-5 w-5 text-yellow-500" />
            Upgrade to Watson PRO
          </DialogTitle>
          <DialogDescription>
            Unlock premium features and enhance your financial advisory capabilities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 text-primary rounded-full px-6 py-3 text-xl font-bold">
              €29.99<span className="text-sm font-normal">/month</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Watson PRO features include:</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="font-medium">Advanced Analytics</span>
                  <p className="text-sm text-muted-foreground">
                    Detailed performance tracking and predictive analysis
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="font-medium">AI-Powered Recommendations</span>
                  <p className="text-sm text-muted-foreground">
                    Personalized investment suggestions based on client profiles
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="font-medium">Priority Support</span>
                  <p className="text-sm text-muted-foreground">
                    Dedicated customer service with faster response times
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="font-medium">Unlimited Clients</span>
                  <p className="text-sm text-muted-foreground">
                    Manage as many clients as you need with no restrictions
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="font-medium">Custom Reporting</span>
                  <p className="text-sm text-muted-foreground">
                    Generate branded reports for your clients
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          
          <Button
            onClick={handleUpgrade}
            disabled={upgradeMutation.isPending}
            className="w-full sm:w-auto bg-accent hover:bg-accent/90"
          >
            {upgradeMutation.isPending ? (
              "Processing..."
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Upgrade Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}