import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Sparkles, Calendar, Mail, FileText, Users, BarChart4, Brain, Send, User, Plus, History, X, Trash2, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/markdown.css';
import { ToastAction } from "../components/ui/toast";
import { CalendarDialog } from "../components/dialog/CalendarDialog";
import { useQueryClient } from "@tanstack/react-query";
import MeetingCard from "@/components/MeetingCard";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// Tipo per i messaggi della chat
interface Message {
  content: string;
  role: 'user' | 'assistant' | 'system';
  id?: number;
  createdAt?: string;
  model?: string;
  functionResults?: string;
}

// Tipo per le conversazioni
interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

// Funzione per ottenere il nome del luogo
const getLocationName = (location: string) => {
  switch (location) {
    case 'office':
      return 'Ufficio';
    case 'client_office':
      return 'Ufficio del cliente';
    case 'zoom':
      return 'Videochiamata Zoom';
    case 'teams':
      return 'Videochiamata Teams';
    case 'phone':
      return 'Telefonata';
    default:
      return location;
  }
};

// Funzione per formattare la durata
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return hours === 1 ? '1h' : `${hours}h`;
  return `${hours}h${remainingMinutes}m`;
};

// Modifica questa funzione per normalizzare gli spazi eccessivi e formattare correttamente gli elenchi
const normalizeMarkdownText = (text: string) => {
  // Pre-processing aggressivo del testo
  let processed = text.trim();

  // 1. Rimuovi le linee vuote in eccesso (più di 2 consecutive)
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // 2. RIMOSSO per mantenere i trattini originali
  
  // 3. Gestisci meglio i paragrafi con un solo a capo
  processed = processed.replace(/([^\n])\n(?!\n|\s*[*-])([^\n])/g, '$1 $2');

  // 4. Gestisci correttamente i titoli (assicurati che abbiano spazio adeguato)
  processed = processed.replace(/\n(#{1,6}\s.+)\n(?!\n)/g, '\n\n$1\n\n');

  // 5. RIMOSSO per mantenere i trattini originali
  
  // 6. Gestione corretta degli elenchi numerati
  // Converti formati di elenchi numerati non standard in formato corretto di Markdown
  processed = processed.replace(/^(\s*)(\d+)[\.\)]\s*(\n+|\s+)(.+)$/gm, '$1$2. $4');
  
  // 7. Assicurati che non ci siano a capo tra il numero e il testo dell'elenco
  processed = processed.replace(/^(\s*)(\d+)\.\s*\n+\s*(.+)$/gm, '$1$2. $3');
  
  return processed;
};

export default function AgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<'gpt-4.1-mini' | 'gpt-4.1'>('gpt-4.1');
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  
  // Calendario
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);

  // Definizione delle capacità dell'assistente
  const capabilities = [
    { 
      title: "Insight clienti", 
      description: "Analisi dei profili clienti e generazione di email personalizzate",
      icon: <Users className="h-8 w-8 p-1.5" />,
      gradient: "from-blue-500 to-cyan-400"
    },
    {
      title: "Calendario e incontri",
      description: "Pianificazione e follow-up degli incontri con clienti",
      icon: <Calendar className="h-8 w-8 p-1.5" />,
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      title: "Generazione idee",
      description: "Crea idee per i tuoi clienti basate sulle ultime notizie di mercato",
      icon: <BarChart4 className="h-8 w-8 p-1.5" />,
      gradient: "from-emerald-500 to-teal-400"
    },
    {
      title: "Assistenza generale",
      description: "Supporto sull'app Gervis e sulla regolamentazione MIFID",
      icon: <FileText className="h-8 w-8 p-1.5" />,
      gradient: "from-amber-500 to-orange-400"
    }
  ];
  
  // Modelli OpenAI disponibili
  const AVAILABLE_MODELS = {
    STANDARD: 'gpt-4.1-mini' as const,
    ADVANCED: 'gpt-4.1' as const
  };
  
  // Carica le conversazioni esistenti all'avvio
  useEffect(() => {
      fetchConversations();
  }, []);
  
  // Scorrimento automatico quando arrivano nuovi messaggi
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Funzione per caricare le conversazioni
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/agent/conversations');
      
      if (response.success) {
        setConversations(response.conversations || []);
      } else {
        toast({
          title: "Errore",
          description: "Impossibile caricare le conversazioni",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nel caricamento delle conversazioni:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per caricare una conversazione specifica
  const loadConversation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/api/agent/conversations/${id}`);
      
      if (response.success) {
        setMessages(response.messages);
        setCurrentConversationId(id);
        setShowChat(true);
        setIsConversationsOpen(false);
      } else {
        toast({
          title: "Errore",
          description: "Impossibile caricare la conversazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nel caricamento della conversazione:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestione dell'invio di messaggi
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Mostra la chat se non è già visibile
    setShowChat(true);
      
    // Aggiungi il messaggio dell'utente
      const userMessage: Message = {
        content: input,
      role: 'user',
      createdAt: new Date().toISOString()
      };
      
    setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      
    try {
      // Prepara i dati per la richiesta
      const requestData: { message: string; conversationId?: number; model?: string } = {
        message: input,
        model: currentModel
      };
      
      // Aggiungi conversationId solo se è un valore valido
      if (typeof currentConversationId === 'number') {
        requestData.conversationId = currentConversationId;
      }
      
      // Invia la richiesta all'API
      const response = await apiRequest('/api/agent/chat', {
          method: 'POST',
        body: JSON.stringify(requestData)
      });
        
      // DEBUG: Mostro la risposta originale di OpenAI nel terminale
      console.log('------------- DEBUG RISPOSTA OPENAI -------------');
      console.log('Response originale:', response);
      if (response.response) {
        console.log('CONTENUTO TESTO:');
        console.log(response.response);
        console.log('RAPPRESENTAZIONE ESCAPE PER VISUALIZZARE NEW LINE:');
        console.log(JSON.stringify(response.response));
      }
      console.log('------------------------------------------------');
        
        if (response.success) {
          // Aggiorna l'ID della conversazione se è una nuova
        if (!currentConversationId && response.conversationId) {
              setCurrentConversationId(response.conversationId);
        }
        
        // Aggiungi la risposta dell'assistente con il modello utilizzato
          const assistantMessage: Message = {
          content: response.response || "Non ho ricevuto una risposta dal server",
            role: 'assistant',
          createdAt: new Date().toISOString(),
          model: response.model || currentModel,
          functionResults: response.functionResults ? JSON.stringify(response.functionResults) : undefined
        };
        
        setMessages(prev => [...prev, assistantMessage]);
          
        // Gestisci il dialog per la creazione di meeting se presente
        if (response.showMeetingDialog && response.meetingDialogData) {
          console.log('[Agent] Meeting dialog data:', response.meetingDialogData);
          
          // Mostra direttamente il dialog di creazione meeting
          setMeetingData(response.meetingDialogData);
          setShowMeetingDialog(true);
          }
          
          // Aggiorna la lista delle conversazioni
          fetchConversations();
        } else {
          toast({
            title: "Errore",
            description: response.message || "Si è verificato un errore nella comunicazione con l'agente",
            variant: "destructive",
          });
        }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'invio del messaggio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per gestire la creazione dell'appuntamento
  const handleCreateMeeting = async (event: any, sendEmail: boolean) => {
    try {
      console.log("Creazione meeting con dati:", event);
      
      const response = await apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          clientId: event.clientId,
          subject: event.title,
          dateTime: event.dateTime,
          duration: event.duration,
          location: event.location || "zoom",
          notes: event.notes || "",
          sendEmail: sendEmail
        })
      });
      
      if (response.success) {
        toast({
          title: "Appuntamento creato",
          description: "L'appuntamento è stato creato con successo",
        });
        
        // Aggiorna eventuali dati di calendario in cache
        queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante la creazione dell'appuntamento",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nella creazione dell'appuntamento:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione dell'appuntamento",
        variant: "destructive",
      });
    } finally {
      setShowMeetingDialog(false);
    }
  };
  
  // Funzione per gestire l'aggiornamento di un meeting esistente
  const handleUpdateMeeting = async (event: any, sendEmail: boolean) => {
    try {
      console.log("Aggiornamento meeting con dati:", event);
      
      const response = await apiRequest(`/api/meetings/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          clientId: event.clientId,
          subject: event.title,
          dateTime: event.dateTime,
          duration: event.duration,
          location: event.location || "zoom",
          notes: event.notes || ""
        })
      });
      
      if (response.success) {
        toast({
          title: "Appuntamento aggiornato",
          description: "L'appuntamento è stato modificato con successo",
        });
        
        // Aggiorna eventuali dati di calendario in cache
        queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'aggiornamento dell'appuntamento",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'appuntamento:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dell'appuntamento",
        variant: "destructive",
      });
    } finally {
      setShowMeetingDialog(false);
    }
  };
  
  // Funzione per avviare una nuova conversazione
  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowChat(false);
    setIsConversationsOpen(false);
  };
  
  // Funzione per eliminare una conversazione
  const deleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      setIsLoading(true);
      
      const response = await apiRequest(`/api/agent/conversations/${conversationToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Rimuovi la conversazione dall'elenco
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));
        
        // Se è la conversazione corrente, avvia una nuova
        if (currentConversationId === conversationToDelete.id) {
          startNewConversation();
        }
        
        // Mostra notifica
        toast({
          title: "Conversazione eliminata",
          description: "La conversazione è stata eliminata con successo",
        });
      } else {
      toast({
        title: "Errore",
          description: response.message || "Si è verificato un errore durante l'eliminazione della conversazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nell'eliminazione della conversazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della conversazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };
  
  // Funzione per eliminare tutte le conversazioni
  const deleteAllConversations = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('/api/agent/conversations', {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Svuota l'elenco delle conversazioni
        setConversations([]);
        
        // Avvia una nuova conversazione
        startNewConversation();
        
        // Mostra notifica
        toast({
          title: "Conversazioni eliminate",
          description: "Tutte le conversazioni sono state eliminate con successo",
        });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'eliminazione delle conversazioni",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nell'eliminazione di tutte le conversazioni:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione delle conversazioni",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsDeleteAllDialogOpen(false);
    }
  };  
  // Gestisce l'invio del messaggio con il tasto invio
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Formatta il timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handler per click sul pulsante elimina
  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation(); // Evita di selezionare la conversazione
    setConversationToDelete(conversation);
    setIsDeleteDialogOpen(true);
  };
  
  // Funzione per copiare il contenuto del messaggio
  const copyMessageContent = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };
  
  // Renderizza un messaggio
  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    // Verifica se i risultati delle funzioni contengono meeting
    let meetings = null;
    let meetingsCardTitle = "Appuntamenti";
    let meetingsCardDescription = null;
    // Variabile per tenere il messaggio originale
    let originalContent = message.content;
    
    if (!isUser && message.functionResults) {
      try {
        const functionResults = JSON.parse(message.functionResults);
        if (functionResults && functionResults.length > 0) {
          const functionResult = functionResults[0];
          
          // Controlla se è un risultato da getMeetingsByDateRange
          if (functionResult.meetings && Array.isArray(functionResult.meetings)) {
            // Estrai i meeting
            meetings = functionResult.meetings;
            
            // Prepara il messaggio con l'orizzonte temporale
            let timeframe = "";
            
            // Se il risultato viene da getMeetingsByDateRange, aggiungi la descrizione del periodo
            if (functionResult.dateRangeFormatted) {
              meetingsCardDescription = functionResult.dateRangeFormatted;
              timeframe = functionResult.dateRangeFormatted.toLowerCase();
            } else if (functionResult.period) {
              // Potrebbe contenere informazioni sul periodo in un altro formato
              timeframe = `dal ${functionResult.period.start} al ${functionResult.period.end}`;
              meetingsCardDescription = timeframe;
            } else if (functionResult.clientName) {
              // Se il risultato viene da getMeetingsByClientName, personalizza il titolo
              meetingsCardTitle = `Appuntamenti con ${functionResult.clientName}`;
              timeframe = `con ${functionResult.clientName}`;
            }
            
            // Costruisci il messaggio
            originalContent = timeframe 
              ? `Eccoli!` 
              : "Eccoli!";
          }
        }
      } catch (e) {
        console.error("Errore nel parsing dei risultati delle funzioni:", e);
      }
    }
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
          <Avatar className={`h-8 w-8 ${isUser ? 'ml-3' : 'mr-3'} flex-shrink-0`}>
            <AvatarFallback className={isUser ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}>
              {isUser ? <User size={16} /> : <Bot size={16} />}
            </AvatarFallback>
          </Avatar>
          
            <div className={`
              py-3 px-4 rounded-2xl relative
              ${isUser 
                ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white' 
                : 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700'}
          `}>
            {!isUser && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyMessageContent(message.content, index)}
                className={`absolute top-1 right-1 h-6 w-6 p-1 opacity-50 hover:opacity-100 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 z-10 ${isUser ? 'text-white' : 'text-gray-500'}`}
                title="Copia messaggio"
              >
                {copiedMessageIndex === index ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            )}
            
            <div className="text-sm whitespace-pre-wrap break-words">
              {isUser ? (
                message.content
              ) : (
                <div className="markdown-content">
                  {/* Prima mostriamo il messaggio, poi la card dei meeting */}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Personalizza i paragrafi per avere meno spazio
                      p: ({children}) => {
                        // Se il paragrafo è vuoto, non renderizzare nulla
                        if (children === undefined || 
                            (Array.isArray(children) && children.length === 0) ||
                            children === '\n') {
                          return null;
                        }
                        
                        return <p style={{marginTop: '0.8em', marginBottom: '0.8em'}}>{children}</p>;
                      },
                      // Personalizza i titoli per ridurre lo spazio
                      h1: ({children}) => <h1 style={{marginBottom: '0.8em'}}>{children}</h1>,
                      h2: ({children}) => <h2 style={{marginBottom: '0.8em'}}>{children}</h2>,
                      h3: ({children}) => <h3 style={{marginBottom: '0.8em'}}>{children}</h3>,
                      // Gestisci i line break in modo più compatto
                      br: () => <span style={{display: 'block', height: '1.2em'}} />,
                      // Personalizza gli elenchi per garantire indentazione coerente
                      ul: ({children}) => <ul style={{marginTop: '1em', marginBottom: '1em', paddingLeft: '1.5rem'}}>{children}</ul>,
                      ol: ({children}) => <ol style={{marginTop: '1em', marginBottom: '1em', paddingLeft: '1.5rem'}}>{children}</ol>,
                      li: ({children, ...props}) => {
                        // La complessità del controllo per gli elementi annidati è stata rimossa
                        // perché non è necessaria per lo stile visivo
                        return (
                          <li style={{
                            marginTop: '0.5em', 
                            marginBottom: '0.5em', 
                            display: 'list-item',
                            lineHeight: '2.2'
                          }}>
                            {children}
                          </li>
                        );
                      }
                    }}
                  >
                    {normalizeMarkdownText(originalContent)}
                  </ReactMarkdown>
                  
                  {/* Renderizza la card dei meeting se presente */}
                  {meetings && meetings.length > 0 ? (
                    <div className="mt-3">
                      <MeetingCard 
                        meetings={meetings} 
                        title={meetingsCardTitle}
                        description={meetingsCardDescription}
                        onEditMeeting={(meeting) => {
                          if (meeting.id) {
                            setMeetingData({
                              id: meeting.id,
                              clientId: meeting.clientId || 0,
                              subject: meeting.title,
                              dateTime: meeting.dateTime,
                              duration: meeting.duration,
                              location: meeting.location || "zoom",
                              notes: meeting.notes || "",
                              isEdit: true
                            });
                            setShowMeetingDialog(true);
                          }
                        }}
                        onPrepareMeeting={(meeting) => {
                          // Avvia una nuova conversazione
                          startNewConversation();
                          setShowChat(true); // Assicuriamoci che la chat sia visibile
                          
                          // Costruisci un prompt dettagliato per la preparazione dell'appuntamento
                          const clientName = meeting.clientName || 
                            (meeting.client ? `${meeting.client.firstName} ${meeting.client.lastName}` : 
                            (meeting.clientId ? `Cliente ${meeting.clientId}` : 'Cliente'));
                          
                          const meetingDate = parseISO(meeting.dateTime);
                          const formattedDate = format(meetingDate, "EEEE d MMMM yyyy", { locale: it });
                          const formattedTime = format(meetingDate, "HH:mm", { locale: it });
                          const location = getLocationName(meeting.location || 'office');
                          
                          // Costruisci un prompt completo
                          const prompt = `Preparami per il meeting con ${clientName} di ${formattedDate} alle ${formattedTime}.

L'incontro avrà una durata di ${formatDuration(meeting.duration)} e si terrà presso ${location}.
${meeting.notes ? `\nNote sull'appuntamento: ${meeting.notes}` : ''}

Per favore aiutami con:
1. Un riepilogo del profilo del cliente e dei suoi obiettivi finanziari
2. Argomenti principali da affrontare durante l'incontro
3. Eventuali documenti o materiali da preparare
4. Suggerimenti per rendere produttivo l'incontro
5. Possibili prodotti o servizi da proporre in base al profilo del cliente

Grazie!`;
                          
                          // Utilizziamo un timeout più lungo per assicurare che l'interfaccia si aggiorni completamente
                          setTimeout(() => {
                            // Impostiamo l'input e forziamo l'invio del messaggio
                            setInput(prompt);
                            
                            // Utilizziamo un secondo timeout più lungo per assicurarci che l'input sia stato aggiornato
                            setTimeout(() => {
                              // Invia il messaggio direttamente senza utilizzare lo stato
                              const userMessage: Message = {
                                content: prompt,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              
                              setMessages(prev => [...prev, userMessage]);
                              setInput('');
                              setIsLoading(true);
                              
                              // Prepara i dati per la richiesta
                              const requestData = {
                                message: prompt,
                                model: currentModel
                              };
                              
                              // Invia la richiesta all'API
                              apiRequest('/api/agent/chat', {
                                method: 'POST',
                                body: JSON.stringify(requestData)
                              }).then(response => {
                                if (response.success) {
                                  // Aggiorna l'ID della conversazione se è una nuova
                                  if (!currentConversationId && response.conversationId) {
                                    setCurrentConversationId(response.conversationId);
                                  }
                                  
                                  // Aggiungi la risposta dell'assistente
                                  const assistantMessage: Message = {
                                    content: response.response || "Non ho ricevuto una risposta dal server",
                                    role: 'assistant',
                                    createdAt: new Date().toISOString(),
                                    model: response.model || currentModel,
                                    functionResults: response.functionResults ? JSON.stringify(response.functionResults) : undefined
                                  };
                                  
                                  setMessages(prev => [...prev, assistantMessage]);
                                  
                                  // Gestisci il dialog per la creazione di meeting se presente
                                  if (response.showMeetingDialog && response.meetingDialogData) {
                                    setMeetingData(response.meetingDialogData);
                                    setShowMeetingDialog(true);
                                  }
                                  
                                  // Aggiorna la lista delle conversazioni
                                  fetchConversations();
                                } else {
                                  toast({
                                    title: "Errore",
                                    description: response.message || "Si è verificato un errore nella comunicazione con l'agente",
                                    variant: "destructive",
                                  });
                                }
                              }).catch(error => {
                                console.error("Errore nell'invio del messaggio:", error);
                                toast({
                                  title: "Errore",
                                  description: "Si è verificato un errore nell'invio del messaggio",
                                  variant: "destructive",
                                });
                              }).finally(() => {
                                setIsLoading(false);
                              });
                            }, 300);
                          }, 300);
                        }}
                      />
                        </div>
                  ) : null}
                      </div>
              )}
                      </div>
                      
            <div className="flex justify-end items-center mt-1">
              {message.createdAt && (
                <div className="text-xs opacity-70 text-right">
                  {formatTimestamp(message.createdAt)}
                      </div>
              )}
                        </div>
                      </div>
                      </div>
      </motion.div>
    );
  };
            
  // Renderizza schermata delle capacità
  const renderMainScreen = () => {
    return (
              <motion.div 
        key="capabilities-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full py-4 flex flex-col h-full"
      >
        <div className={`flex flex-col ${showChat ? 'h-full' : ''}`}>
          {/* Header visibile solo quando non c'è chat attiva */}
          {!showChat && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6 mx-auto text-center"
            >
              <div className="flex items-center justify-center mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    <Bot size={24} />
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 text-left">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Gervis AI Assistant
                  </h1>
                  <p className="text-sm text-muted-foreground">L'assistente di riferimento per consulenti finanziari</p>
                    </div>
              </div>
              </motion.div>
            )}
            
          {!showChat && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full mb-6 auto-rows-auto">
              {capabilities.map((capability, index) => (
              <motion.div 
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                  className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-md transition-all"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="p-3">
                    <div>
                      <div className={`inline-flex rounded-full bg-gradient-to-r ${capability.gradient} p-1.5 text-white shadow-sm mb-2`}>
                        {capability.icon}
                      </div>
                        
                      <h3 className="text-base font-medium mb-1 flex items-center">
                        {capability.title}
                        <Sparkles className="h-4 w-4 ml-1.5 text-blue-500" />
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-2">{capability.description}</p>
                    </div>
                    
                    {/* Example questions */}
                    <div className="mt-2 space-y-1.5">
                      <div className="border-t border-gray-100 dark:border-gray-800 pt-1 mb-1">
                        <span className="text-xs text-muted-foreground">Esempi</span>
                      </div>
                      {index === 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Mi ricordi che esigenze ha Francesca Bianchi?";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <User className="h-3 w-3 mr-1.5 flex-shrink-0 text-blue-500" />
                            <div className="whitespace-normal overflow-hidden">Mi ricordi che esigenze ha Francesca Bianchi?</div>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Dammi qualche idea da proporre a Mario Rossi";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <User className="h-3 w-3 mr-1.5 flex-shrink-0 text-blue-500" />
                            <span className="whitespace-normal">Dammi qualche idea da proporre a Mario Rossi</span>
                          </Button>
                        </>
                      )}
                      
                      {index === 1 && (
                        <>
                          <Button
                            variant="outline" 
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Organizza meeting con Mario Rossi domani alle 18";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0 text-purple-500" />
                            <span className="whitespace-normal">Organizza meeting con Mario Rossi domani alle 18</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Che incontri abbiamo questa settimana?";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0 text-purple-500" />
                            <span className="whitespace-normal">Che incontri abbiamo questa settimana?</span>
                          </Button>
                        </>
                      )}
                      
                      {index === 2 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "News dai mercati?";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <BarChart4 className="h-3 w-3 mr-1.5 flex-shrink-0 text-emerald-500" />
                            <span className="whitespace-normal">News dai mercati?</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Genera qualche idea basata su news";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <BarChart4 className="h-3 w-3 mr-1.5 flex-shrink-0 text-emerald-500" />
                            <span className="whitespace-normal">Genera qualche idea basata su news</span>
                          </Button>
                        </>
                      )}
                      
                      {index === 3 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Come aggiungo un nuovo cliente?";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1.5 flex-shrink-0 text-amber-500" />
                            <span className="whitespace-normal">Come aggiungo un nuovo cliente?</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                            onClick={() => {
                              const message = "Come onboardo nuovo cliente?";
                              setInput(message);
                              // Send message directly with the value instead of relying on state update
                              const userMessage: Message = {
                                content: message,
                                role: 'user',
                                createdAt: new Date().toISOString()
                              };
                              setMessages(prev => [...prev, userMessage]);
                              // Show chat immediately
                              setShowChat(true);
                              // Call the API
                              handleDirectMessageSend(message);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1.5 flex-shrink-0 text-amber-500" />
                            <span className="whitespace-normal">Come onboardo nuovo cliente?</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
                            </div>
                          )}
          
          {showChat && (
            <div className="w-full flex-grow overflow-y-auto mb-4 px-4 sm:px-0">
              <div className="flex flex-col space-y-4 max-w-6xl mx-auto">
                {/* Indicatore del modello in uso */}
                <div className="flex justify-center my-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                    <Bot className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Modello in uso: {currentModel === AVAILABLE_MODELS.STANDARD ? 'Standard' : 'Avanzato'}
                    </span>
                        </div>
                      </div>
                      
                {messages
                  .filter(message => message.role !== 'system')
                  .map(renderMessage)}
                {isLoading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground ml-11">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    <span>Gervis sta scrivendo...</span>
                      </div>
                )}
                <div ref={messagesEndRef} />
                    </div>
                    </div>
            )}
            
              <motion.div 
            className={`w-full ${showChat ? 'mt-auto' : 'mt-2'}`}
            initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative max-w-6xl mx-auto">
              <input 
                type="text" 
                className="w-full px-4 py-3 pr-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Come posso aiutarti oggi?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
                      <Button 
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
                      </Button>
                </div>
            
            {!showChat && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Inizia a scrivere per interagire con Gervis
              </p>
            )}
          </motion.div>
          
          {/* Selettore di modello spostato fuori dalla barra di input, dopo il messaggio di inizio */}
              <motion.div 
            className="flex justify-center max-w-6xl mx-auto mt-4"
            initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-medium mb-1">Seleziona il modello AI</div>
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCurrentModel(AVAILABLE_MODELS.STANDARD)}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    currentModel === AVAILABLE_MODELS.STANDARD
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center">
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Standard (gpt-4.1-mini)
                      </div>
                  <div className="text-xs opacity-70 mt-0.5">
                    Veloce e efficiente
                                </div>
                </button>
                <button
                  onClick={() => setCurrentModel(AVAILABLE_MODELS.ADVANCED)}
                  className={`px-6 py-2 rounded-md text-sm font-medium ml-1 transition-all ${
                    currentModel === AVAILABLE_MODELS.ADVANCED
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Avanzato (gpt-4.1)
                                </div>
                  <div className="text-xs opacity-70 mt-0.5">
                    Più potente e preciso
                              </div>
                </button>
                                </div>
                                  </div>
          </motion.div>
                              </div>
              </motion.div>
    );
  };
  
  // Renderizza pannello laterale con conversazioni
  const renderConversationsSidebar = () => {
    return (
      <AnimatePresence>
        {isConversationsOpen && (
              <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed top-[56px] right-0 bottom-0 w-80 bg-white dark:bg-gray-950 border-l shadow-md z-20 flex flex-col"
          >
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-medium text-sm">Le tue conversazioni</h3>
              <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                  size="icon"
                  onClick={() => setIsDeleteAllDialogOpen(true)}
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Elimina tutte le conversazioni"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsConversationsOpen(false)}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                                  </Button>
                                </div>
                            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <p className="text-sm text-muted-foreground mt-2">Caricamento...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Nessuna conversazione
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conversation => (
                    <div 
                      key={conversation.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors relative group ${
                        currentConversationId === conversation.id 
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-900 border-transparent'
                      } border`}
                      onClick={() => loadConversation(conversation.id)}
                    >
                      <div className="font-medium text-sm truncate pr-8">{conversation.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                    </div>
                        <Button
                        size="icon"
                        variant="ghost" 
                        className="h-6 w-6 p-0 absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteClick(e, conversation)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-500" />
                        </Button>
                      </div>
                  ))}
                    </div>
            )}
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Handle direct message sending (used by example buttons)
  const handleDirectMessageSend = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    setIsLoading(true);
    // Clear input after sending the message
    setInput('');
    
    try {
      // Prepare request data
      const requestData: { message: string; conversationId?: number; model?: string } = {
        message: message,
        model: currentModel
      };
      
      // Add conversationId if valid
      if (typeof currentConversationId === 'number') {
        requestData.conversationId = currentConversationId;
      }
      
      // Send request to API
      const response = await apiRequest('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      // Debug response
      console.log('------------- DEBUG RISPOSTA OPENAI -------------');
      console.log('Response originale:', response);
      if (response.response) {
        console.log('CONTENUTO TESTO:');
        console.log(response.response);
        console.log('RAPPRESENTAZIONE ESCAPE PER VISUALIZZARE NEW LINE:');
        console.log(JSON.stringify(response.response));
      }
      console.log('------------------------------------------------');
      
      if (response.success) {
        // Update conversation ID if new
        if (!currentConversationId && response.conversationId) {
          setCurrentConversationId(response.conversationId);
        }
        
        // Add assistant response
        const assistantMessage: Message = {
          content: response.response || "Non ho ricevuto una risposta dal server",
          role: 'assistant',
          createdAt: new Date().toISOString(),
          model: response.model || currentModel,
          functionResults: response.functionResults ? JSON.stringify(response.functionResults) : undefined
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Handle meeting dialog if present
        if (response.showMeetingDialog && response.meetingDialogData) {
          console.log('[Agent] Meeting dialog data:', response.meetingDialogData);
          setMeetingData(response.meetingDialogData);
          setShowMeetingDialog(true);
        }
        
        // Update conversations list
        fetchConversations();
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore nella comunicazione con l'agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'invio del messaggio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 flex justify-between items-center">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback className="bg-blue-600 text-white">
              <Bot size={16} />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold">Gervis AI Assistant</h1>
          </div>
        </div>
        
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsConversationsOpen(!isConversationsOpen)}
              className="bg-white/70 dark:bg-black/70"
            >
              <History className="h-4 w-4 mr-2" />
              Conversazioni
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewConversation}
              className="bg-white/70 dark:bg-black/70"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova chat
            </Button>
          </div>
      </div>
      
      {/* Pannello laterale conversazioni */}
      {renderConversationsSidebar()}
      
      {/* Area principale */}
      <div className={`flex-1 overflow-y-auto px-4 py-6 ${showChat ? 'flex flex-col' : ''}`}>
        <div className={`w-full ${showChat ? 'flex-grow flex flex-col' : ''}`}>
          {renderMainScreen()}
                  </div>
                  </div>
      
      {/* Dialog di conferma eliminazione conversazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina conversazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa conversazione? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
                    <Button
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Annulla
                    </Button>
          <Button 
              variant="destructive" 
              onClick={deleteConversation}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </>
              )}
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma eliminazione di tutte le conversazioni */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina tutte le conversazioni</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare tutte le conversazioni? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-md text-red-600 mb-4">
            <AlertTriangle className="h-5 w-5" />
            <div className="text-sm">
              Tutte le conversazioni saranno eliminate permanentemente.
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteAllDialogOpen(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteAllConversations}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina tutte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per la creazione/modifica dell'appuntamento */}
      {meetingData && (
        <CalendarDialog
          open={showMeetingDialog}
          onOpenChange={setShowMeetingDialog}
          mode={meetingData.isEdit ? "edit" : "create"}
          event={{
            id: meetingData.id,
            clientId: meetingData.clientId,
            title: meetingData.subject || "",
            dateTime: meetingData.dateTime,
            duration: meetingData.duration,
            location: meetingData.location || "zoom",
            notes: meetingData.notes || ""
          }}
          useClientSelector={!meetingData.isEdit}
          onSubmit={meetingData.isEdit ? handleUpdateMeeting : handleCreateMeeting}
        />
      )}
    </div>
  );
} 