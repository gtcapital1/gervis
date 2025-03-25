// This file defines the ClientDialog component.
// It provides a dialog for creating a new client, including basic information such as name, email, and phone number.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Define form schema for creating a client
const clientFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDialog({ open, onOpenChange }: ClientDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });
  
  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      // Add the full name field required by the server
      const payload = {
        ...data,
        name: `${data.firstName} ${data.lastName}` // This is needed for backward compatibility
      };
      
      return apiRequest('/api/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (response) => {
      // Invalidate clients cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      toast({
        title: "Client created",
        description: "The client has been successfully created.",
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create client. Please try again.";
      
      // Check if we have more detailed error information
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error("Failed to create client:", error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });
  
  // Handle form submission
  async function onSubmit(data: ClientFormValues) {
    setIsSubmitting(true);
    createClientMutation.mutate(data);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client's basic information to create their profile.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="client@example.com" 
                      {...field} 
                    />
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
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                type="button"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-accent hover:bg-accent/90" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}