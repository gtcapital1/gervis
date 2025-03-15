import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ChevronRight, 
  Archive, 
  Clock, 
  Phone,
  Mail,
  UserX,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClientDialog } from "../components/advisor/ClientDialog";
import { Client } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch clients
  const { data: clients = [], isLoading, isError } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    retry: 1,
  });

  // Archive client mutation
  const archiveClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client archived",
        description: "The client has been successfully archived.",
      });
      setIsArchiveDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive client. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search query and archived status
  const filteredClients = clients.filter((client: Client) => {
    // First filter by search query
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Then filter by archive status
    const matchesArchiveFilter = showArchived ? 
      client.isArchived === true : 
      client.isArchived !== true;
    
    return matchesSearch && matchesArchiveFilter;
  });

  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

  function handleViewClient(id: number) {
    setLocation(`/clients/${id}`);
  }
  
  function handleArchiveClient(client: Client) {
    setClientToArchive(client);
    setIsArchiveDialogOpen(true);
  }
  
  function confirmArchiveClient() {
    if (clientToArchive) {
      archiveClientMutation.mutate(clientToArchive.id);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client portfolio
          </p>
        </div>
        <Button 
          className="bg-accent hover:bg-accent/90" 
          onClick={() => setIsClientDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </div>
      
      <Separator />
      
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Overview</CardTitle>
            <CardDescription>
              View and manage all your clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant={showArchived ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className={showArchived ? "bg-amber-600" : ""}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {showArchived ? "Showing Archived" : "Show Archived"}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: "Filter option",
                    description: "Advanced filtering will be available soon."
                  });
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading clients...</p>
              </div>
            ) : isError ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-destructive">Error loading clients. Please try again.</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 space-y-3">
                <p className="text-muted-foreground">No clients found</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  Add Your First Client
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: Client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={client.isOnboarded ? "default" : "outline"}
                          className={client.isOnboarded ? "bg-green-600" : ""}
                        >
                          {client.isOnboarded ? "Onboarded" : "Not Onboarded"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClient(client.id)}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleViewClient(client.id)}
                              >
                                View Details
                              </DropdownMenuItem>
                              {client.isArchived ? (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    toast({
                                      title: "Restore feature coming soon",
                                      description: "Restoring archived clients will be available soon."
                                    });
                                  }}
                                >
                                  Restore
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleArchiveClient(client)}
                                  className="text-red-600"
                                >
                                  Archive
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ClientDialog 
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
      />
      
      {/* Archive Client Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {clientToArchive?.name}? Archived clients will be moved to 
              the archive section and won't appear in the main client list.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 border rounded-md bg-muted/50 space-x-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <h4 className="font-medium">This action can be reversed later</h4>
              <p className="text-sm text-muted-foreground">
                You can restore archived clients from the archived clients view.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmArchiveClient}
              disabled={archiveClientMutation.isPending}
            >
              {archiveClientMutation.isPending ? "Archiving..." : "Archive Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}