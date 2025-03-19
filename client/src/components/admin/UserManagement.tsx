import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  company?: string;
  isIndependent?: boolean;
};

export default function UserManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Query per ottenere tutti gli utenti
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Query per ottenere gli utenti in attesa di approvazione
  const { data: pendingUsersData, isLoading: isLoadingPendingUsers, error: pendingUsersError } = useQuery({
    queryKey: ['/api/admin/users/pending'],
    queryFn: () => apiRequest('/api/admin/users/pending'),
  });

  // Mutation per approvare un utente
  const approveMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: t('Utente approvato'),
        description: t('L\'utente è stato approvato con successo'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Errore'),
        description: error.message || t('Si è verificato un errore durante l\'approvazione dell\'utente'),
        variant: 'destructive',
      });
    },
  });

  // Mutation per rifiutare un utente
  const rejectMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: t('Utente rifiutato'),
        description: t('L\'utente è stato rifiutato con successo'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Errore'),
        description: error.message || t('Si è verificato un errore durante il rifiuto dell\'utente'),
        variant: 'destructive',
      });
    },
  });

  // Mutation per eliminare un utente
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        title: t('Utente eliminato'),
        description: t('L\'utente è stato eliminato con successo'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/pending'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Errore'),
        description: error.message || t('Si è verificato un errore durante l\'eliminazione dell\'utente'),
        variant: 'destructive',
      });
    },
  });

  function formatDate(date: string | null) {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  function getApprovalStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In attesa</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approvato</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function handleApprove(userId: number) {
    approveMutation.mutate(userId);
  }

  function handleReject(userId: number) {
    rejectMutation.mutate(userId);
  }

  function handleDelete(userId: number) {
    setSelectedUserId(userId);
  }

  function confirmDelete() {
    if (selectedUserId) {
      deleteMutation.mutate(selectedUserId);
      setSelectedUserId(null);
    }
  }

  if (isLoadingUsers || isLoadingPendingUsers) {
    return <div className="flex justify-center p-6">Caricamento in corso...</div>;
  }

  if (usersError || pendingUsersError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-2">Errore di caricamento</p>
        <p>{(usersError as Error)?.message || (pendingUsersError as Error)?.message}</p>
      </div>
    );
  }

  const users = usersData?.users || [];
  const pendingUsers = pendingUsersData?.users || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('Gestione utenti')}</CardTitle>
        <CardDescription>{t('Gestisci gli utenti della piattaforma')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              {t('In attesa di approvazione')} 
              {pendingUsers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {pendingUsers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">{t('Tutti gli utenti')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('Non ci sono utenti in attesa di approvazione')}
              </div>
            ) : (
              <Table>
                <TableCaption>{t('Lista degli utenti in attesa di approvazione')}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Nome')}</TableHead>
                    <TableHead>{t('Email')}</TableHead>
                    <TableHead>{t('Azienda')}</TableHead>
                    <TableHead>{t('Registrato il')}</TableHead>
                    <TableHead className="text-right">{t('Azioni')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.isIndependent ? t('Indipendente') : user.company}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleApprove(user.id)}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t('Approva')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleReject(user.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('Rifiuta')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="all">
            <Table>
              <TableCaption>{t('Lista completa degli utenti')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Nome')}</TableHead>
                  <TableHead>{t('Email')}</TableHead>
                  <TableHead>{t('Ruolo')}</TableHead>
                  <TableHead>{t('Stato')}</TableHead>
                  <TableHead>{t('Registrato il')}</TableHead>
                  <TableHead className="text-right">{t('Azioni')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                        {user.role === 'admin' ? t('Amministratore') : t('Consulente')}
                      </Badge>
                    </TableCell>
                    <TableCell>{getApprovalStatusBadge(user.approvalStatus)}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.approvalStatus === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApprove(user.id)}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {t('Approva')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReject(user.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              {t('Rifiuta')}
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('Elimina')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('Sei sicuro di voler eliminare questo utente?')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('Questa azione non può essere annullata. Tutti i dati associati a questo utente verranno eliminati permanentemente.')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('Annulla')}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {t('Elimina')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}