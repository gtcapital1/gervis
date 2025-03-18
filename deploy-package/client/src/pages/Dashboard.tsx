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
  AlertTriangle,
  RefreshCcw,
  Star,
  Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { UpgradeDialog } from "../components/pro/UpgradeDialog";
import { Client } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch clients
  const { data, isLoading, isError } = useQuery<{clients: Client[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Estrai i clienti dalla risposta o usa un array vuoto se non disponibili
  const clients = data?.clients || [];

  // Archive client mutation
  const archiveClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}/archive`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsArchiveDialogOpen(false);
      toast({
        title: "Client archived",
        description: "The client has been moved to the archive.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive client. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Restore client mutation
  const restoreClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}/restore`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client restored",
        description: "The client has been restored from the archive.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore client. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: (clientId: number) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client deleted",
        description: "The client has been permanently deleted.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search query and archived status
  const filteredClients = clients
    .filter((client: Client) => {
      // First filter by search query
      const matchesSearch = 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Then filter by archive status
      const matchesArchiveFilter = showArchived ? 
        client.isArchived === true : 
        client.isArchived !== true;
      
      return matchesSearch && matchesArchiveFilter;
    })
    .sort((a, b) => {
      // Sort by last name first
      return a.lastName.localeCompare(b.lastName);
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
  
  function handleDeleteClient(client: Client) {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  }
  
  function confirmDeleteClient() {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b text-black">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">{t('dashboard.clients')}</h1>
          <p className="text-gray-600">
            {t('dashboard.manage_portfolio')}
          </p>
        </div>
        <div className="flex gap-3">
          {/* Rimosso il pulsante "Passa a PRO" dalla dashboard come richiesto */}
          <Button 
            className="bg-accent hover:bg-accent/90" 
            onClick={() => setIsClientDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.add_client')}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.client_overview')}</CardTitle>
            <CardDescription>
              {t('dashboard.view_manage_clients')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('dashboard.search_clients')}
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
                  {showArchived ? t('dashboard.showing_archived') : t('dashboard.show_archived')}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: t('dashboard.filter'),
                    description: "Advanced filtering will be available soon."
                  });
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                {t('dashboard.filter')}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>{t('dashboard.loading_clients')}</p>
              </div>
            ) : isError ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-destructive">{t('dashboard.error_loading')}</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 space-y-3">
                <p className="text-muted-foreground">{t('dashboard.no_clients_found')}</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  {t('dashboard.add_first_client')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">{t('dashboard.name')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('dashboard.email')}</TableHead>
                      <TableHead className="whitespace-nowrap hidden md:table-cell">{t('dashboard.phone')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('dashboard.status')}</TableHead>
                      <TableHead className="whitespace-nowrap hidden md:table-cell">{t('dashboard.created')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: Client) => (
                      <TableRow 
                        key={client.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewClient(client.id)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {client.lastName}, {client.firstName}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate">{client.email}</TableCell>
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{client.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={client.isOnboarded ? "default" : "outline"}
                            className={client.isOnboarded ? "bg-green-600" : ""}
                          >
                            {client.isOnboarded ? t('dashboard.onboarded') : t('dashboard.not_onboarded')}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{formatDate(client.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation(); // Previene la propagazione del click
                                handleViewClient(client.id);
                              }}
                              className="hidden sm:flex"
                            >
                              <ChevronRight className="h-4 w-4" />
                              <span className="sr-only">{t('dashboard.view')}</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Previene la propagazione del click
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">{t('dashboard.actions')}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewClient(client.id);
                                  }}
                                >
                                  {t('dashboard.view_details')}
                                </DropdownMenuItem>
                                {client.isArchived ? (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      restoreClientMutation.mutate(client.id);
                                    }}
                                    className="text-green-600"
                                  >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    {t('dashboard.restore_client')}
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveClient(client);
                                      }}
                                      className="text-amber-600"
                                    >
                                      <Archive className="mr-2 h-4 w-4" />
                                      {t('dashboard.archive')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client);
                                      }}
                                      className="text-red-600"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      {t('dashboard.delete_permanently')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
            <DialogTitle>{t('dashboard.archive_client')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.archive_confirmation').replace('this client', clientToArchive ? `${clientToArchive.firstName} ${clientToArchive.lastName}` : '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 border rounded-md bg-muted/50 space-x-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <h4 className="font-medium">{t('dashboard.action_reversible')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.restore_info')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
            >
              {t('dashboard.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmArchiveClient}
              disabled={archiveClientMutation.isPending}
            >
              {archiveClientMutation.isPending ? t('dashboard.archiving') : t('dashboard.archive_client')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Client Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.delete_client')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.delete_confirmation').replace('this client', clientToDelete ? `${clientToDelete.firstName} ${clientToDelete.lastName}` : '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 border rounded-md bg-muted/50 space-x-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <div>
              <h4 className="font-medium text-red-600">{t('dashboard.action_permanent')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.delete_data_warning')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t('dashboard.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteClient}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? t('dashboard.deleting') : t('dashboard.delete_permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade to PRO Dialog */}
      {user && (
        <UpgradeDialog
          open={isUpgradeDialogOpen}
          onOpenChange={setIsUpgradeDialogOpen}
          userId={user.id}
        />
      )}
    </div>
  );
}