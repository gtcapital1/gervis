import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import UserManagement from '@/components/admin/UserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPanel() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Controllo se l'utente è un amministratore
  useEffect(() => {
    if (!isLoading && user) {
      // Verifica se l'utente è un amministratore
      if (user.role !== 'admin') {
        // Reindirizza alla dashboard se non è un amministratore
        setLocation('/dashboard');
      }
    } else if (!isLoading && !user) {
      // Reindirizza al login se non autenticato
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <p>Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  // Se non è un amministratore, non mostrare nulla (verrà reindirizzato dal useEffect)
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Pannello di Amministrazione</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div className="col-span-1">
          <UserManagement />
        </div>
        
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Statistiche</CardTitle>
              <CardDescription>Panoramica del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funzionalità in sviluppo</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}