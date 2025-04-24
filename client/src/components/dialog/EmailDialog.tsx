import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Mail, Paperclip, User } from "lucide-react";
import { EmailFormData } from "@/types/email";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings } from "lucide-react";

// Struttura base del cliente
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

// Proprietà del dialogo
interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: number; // Ora è opzionale
  title?: string;
  attachmentUrl?: string;
  presetSubject?: string;
  presetMessage?: string;
  includeCustomFooter?: boolean;
  onSubmit: (data: EmailFormData) => void;
  useClientSelector?: boolean; // Flag per abilitare il selettore clienti
  recipientName?: string; // Campo opzionale per email generiche
  recipientEmail?: string; // Campo opzionale per email generiche
}

export function EmailDialog({
  open,
  onOpenChange,
  clientId,
  title,
  attachmentUrl,
  presetSubject = "",
  presetMessage = "",
  includeCustomFooter = true,
  onSubmit,
  useClientSelector = false,
  recipientName = "",
  recipientEmail = "",
}: EmailDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Stati del form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeAttachment, setIncludeAttachment] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(clientId);
  const [genericRecipientName, setGenericRecipientName] = useState(recipientName);
  const [genericRecipientEmail, setGenericRecipientEmail] = useState(recipientEmail);
  const [isGenericEmail, setIsGenericEmail] = useState(!clientId && !useClientSelector);

  // Ottieni i dati del cliente dal clientId attualmente selezionato
  const { data: clientData, isLoading: isClientLoading } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const response = await apiRequest(`/api/clients/${selectedClientId}`);
      // Verifica se abbiamo una risposta e controlliamo sia data che client
      if (!response) {
        console.warn(`Risposta API vuota per ID: ${selectedClientId}`);
        return null;
      }
      // Se abbiamo response.data, usa quello, altrimenti prova response.client
      if (response.data) {
        return response.data;
      } else if (response.client) {
        return response.client;
      } else {
        console.warn(`Dati cliente non trovati per ID: ${selectedClientId}`, response);
        return null;
      }
    },
    enabled: open && !!selectedClientId,
    staleTime: 60000, // Cache per 1 minuto
    retry: 2,
  });

  // Ottieni lista clienti se useClientSelector è true
  const { data: clientsList, isLoading: isClientsLoading } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      console.log("Caricamento lista clienti da API in EmailDialog");
      const response = await apiRequest('/api/clients');
      return response.clients || [];
    },
    enabled: open && useClientSelector,
    staleTime: 60000, // Cache per 1 minuto
  });

  // Ottieni le impostazioni email dell'utente per verificare la configurazione SMTP
  const { data: emailSettings, isLoading: isEmailSettingsLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/user/email-settings');
      return response.emailSettings || {};
    },
    enabled: open,
    staleTime: 60000, // Cache per 1 minuto
  });

  // Verifica se l'utente ha configurato SMTP
  const hasSmtpConfigured = emailSettings?.custom_email_enabled === true;

  // Monitora lo stato della query cliente
  useEffect(() => {
    if (open && selectedClientId && !clientData && !isClientLoading) {
      console.log(`Tentativo di recupero dati cliente per ID: ${selectedClientId}`);
    }
  }, [open, selectedClientId, clientData, isClientLoading]);

  // Inizializza form quando si apre il dialog
  useEffect(() => {
    if (open) {
      setSubject(presetSubject);
      setMessage(presetMessage);
      setIncludeAttachment(!!attachmentUrl);
      
      // Se useClientSelector è true, non blocchiamo il cliente selezionato
      // ma permettiamo di cambiarlo tramite il dropdown
      setSelectedClientId(clientId);
      setGenericRecipientName(recipientName);
      setGenericRecipientEmail(recipientEmail);
      setIsGenericEmail(!clientId && !useClientSelector);
      
      // Log per debug
      console.log(`Inizializzazione dialog:`, {
        clientId,
        useClientSelector,
        isGenericEmail: !clientId && !useClientSelector
      });
    }
  }, [open, presetSubject, presetMessage, attachmentUrl, clientId, recipientName, recipientEmail, useClientSelector]);

  // Handle form submission
  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Attenzione",
        description: "L'oggetto e il messaggio sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    // Controlla se abbiamo un destinatario valido
    const hasValidRecipient = (
      // O abbiamo dati cliente validi
      (selectedClientId && clientData) || 
      // O abbiamo dati generici validi
      (isGenericEmail && genericRecipientName.trim() && genericRecipientEmail.trim())
    );

    if (!hasValidRecipient) {
      toast({
        title: "Errore",
        description: "Destinatario non valido o mancante",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    let emailData: EmailFormData;

    if (selectedClientId && clientData) {
      // Email a un cliente esistente
      emailData = {
        subject,
        message,
        recipientName: `${clientData.firstName} ${clientData.lastName}`,
        recipientEmail: clientData.email,
        clientId: selectedClientId,
        includeAttachment: attachmentUrl ? includeAttachment : undefined,
        attachmentUrl: includeAttachment ? attachmentUrl : undefined,
      };
    } else {
      // Email generica
      emailData = {
        subject,
        message,
        recipientName: genericRecipientName,
        recipientEmail: genericRecipientEmail,
        clientId: selectedClientId,
        includeAttachment: attachmentUrl ? includeAttachment : undefined,
        attachmentUrl: includeAttachment ? attachmentUrl : undefined,
      };
    }

    try {
      onSubmit(emailData);
      // Resettiamo il form
      setSubject("");
      setMessage("");
      setIncludeAttachment(false);
      
      // Chiudiamo il dialog
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Funzioni di rendering
  
  // Rendering del selettore destinatario
  const renderRecipientField = () => {
    // Log per debug
    console.log("Rendering recipient field:", {
      useClientSelector,
      isClientsLoading,
      clientsListLength: clientsList?.length || 0,
      selectedClientId,
      isClientLoading
    });
    
    // Se abbiamo attivato il selettore clienti e ci sono dati
    if (useClientSelector) {
      if (isClientsLoading) {
        return (
          <div className="p-2 border rounded-md bg-gray-50">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        );
      }

      if (clientsList && clientsList.length > 0) {
        return (
          <Select 
            value={selectedClientId?.toString() || ""}
            onValueChange={(value) => {
              const id = parseInt(value);
              console.log(`Cliente selezionato nel dropdown: ${id}`);
              setSelectedClientId(id);
              setIsGenericEmail(false);
            }}
          >
            <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Seleziona un destinatario" />
            </SelectTrigger>
            <SelectContent>
              {clientsList.map((client: Client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.firstName} {client.lastName} ({client.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      } else {
        // Non ci sono clienti disponibili, ma useClientSelector è true
        return (
          <div className="p-2 border rounded-md bg-yellow-50 text-yellow-800">
            <span>Nessun cliente disponibile per la selezione</span>
          </div>
        );
      }
    }

    // Se abbiamo un cliente specifico
    if (selectedClientId) {
      if (isClientLoading) {
        return (
          <div className="p-2 border rounded-md bg-gray-50">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        );
      }

      // Cliente specifico
      if (clientData) {
        return (
          <div className="p-2 border rounded-md bg-gray-50 text-gray-800">
            <span>
              {clientData.firstName} {clientData.lastName} <span className="text-gray-500">({clientData.email})</span>
            </span>
          </div>
        );
      } else {
        // Cliente non trovato ma abbiamo un ID
        console.log("Cliente non trovato ma ID presente:", selectedClientId);
        return (
          <div className="p-2 border rounded-md bg-yellow-50 text-yellow-800">
            <span>Caricamento destinatario in corso... ({selectedClientId})</span>
          </div>
        );
      }
    }

    // Se è un'email generica o non abbiamo dati cliente
    return (
      <div className="space-y-2">
        <Input 
          value={genericRecipientName}
          onChange={(e) => setGenericRecipientName(e.target.value)}
          className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Nome e cognome del destinatario"
        />
        <Input 
          value={genericRecipientEmail}
          onChange={(e) => setGenericRecipientEmail(e.target.value)}
          className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Email del destinatario"
          type="email"
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-lg shadow-xl border-0">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
          <DialogTitle className="text-xl font-bold">
            {title || t("Invia email")}
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-1">
            {t("Componi e invia un'email")}
          </DialogDescription>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {!hasSmtpConfigured && !isEmailSettingsLoading && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertDescription className="flex flex-row items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Per inviare email, configura le impostazioni SMTP nel tab Impostazioni</span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="recipient-name" className="text-sm font-medium flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-500" />
                <span>Destinatario:</span>
              </Label>
              
              {renderRecipientField()}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-sm font-medium flex items-center">
                <span>Oggetto:</span>
              </Label>
              <Input 
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Oggetto dell'email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-content" className="text-sm font-medium flex items-center">
                <span>Messaggio:</span>
              </Label>
              <Textarea 
                id="email-content"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[300px] font-mono text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Scrivi il contenuto dell'email qui..."
              />
            </div>

            {attachmentUrl && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>{t("Includi allegato")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {attachmentUrl.split('/').pop()}
                  </p>
                </div>
                <Switch
                  checked={includeAttachment}
                  onCheckedChange={setIncludeAttachment}
                />
              </div>
            )}

            {includeCustomFooter && (
              <div className="text-sm bg-slate-50 p-3 rounded-md border border-slate-200 mt-2">
                <p>Una firma con i tuoi contatti verrà aggiunta automaticamente in calce all'email.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="bg-white"
          >
            {t("Annulla")}
          </Button>
          {hasSmtpConfigured ? (
            <Button 
              onClick={handleSubmit}
              disabled={isSending || !subject.trim() || !message.trim() || (selectedClientId ? isClientLoading : false)}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Mail className="h-4 w-4" />
              {isSending ? t("Invio in corso...") : t("Invia email")}
            </Button>
          ) : (
            <Button 
              className="bg-amber-600 hover:bg-amber-700 gap-2"
              onClick={() => window.location.href = '/settings?tab=email'}
            >
              <Settings className="h-4 w-4" />
              {t("Configura SMTP in Impostazioni")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 