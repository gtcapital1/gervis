import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Sparkles, Calendar, Mail, FileText, Users, BarChart4, Brain, Send, User, Plus, History, X, Trash2, AlertTriangle, Loader2, Copy, Check, ChartPieIcon, CheckCircle, Save } from 'lucide-react';
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
import { EmailDialog } from "@/components/dialog/EmailDialog";
import { EmailFormData } from "@/types/email";
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessagesSquare } from 'lucide-react';
import { useLocation } from 'wouter';
import api from '@/lib/api';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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

  // Identifica se il testo contiene tabelle markdown
  const containsTables = /\|(.+)\|/.test(text);
  
  // Se ci sono tabelle, esegui solo le operazioni sicure che non interferiscono con il formato tabella
  if (containsTables) {
    // Applica solo trasformazioni minime per preservare il formato delle tabelle
    return processed;
  }
  
  // Altrimenti, applica tutte le trasformazioni standard
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

// Types for chat functionality
type ChatState = 'idle' | 'sending' | 'loading' | 'error';

// Types for meetings
interface MeetingDialogData {
  id?: number;
  clientId: number;
  clientName: string;
  subject: string;
  dateTime: string;
  formattedDate: string;
  formattedTime: string;
  duration: number;
  location: string;
  notes: string;
  isEdit?: boolean;
}

// Types for emails
interface EmailDialogData {
  clientId: number;
  clientName: string;
  subject: string;
  emailType: string;
  content: string;
}

// Types for generated portfolio
interface GeneratedPortfolio {
  name: string;
  description: string;
  clientProfile: string;
  riskLevel: string;
  investmentHorizon: string;
  allocation: PortfolioAllocation[];
  generationLogic: string;
}

// Interface for portfolio allocation
interface PortfolioAllocation {
  productId: number;
  category: string;
  name: string;
  percentage: number;
}

// Interface for portfolio metrics
interface PortfolioMetrics {
  averageRisk: number;
  averageInvestmentHorizon: number | null;
  assetClassDistribution: {
    [key: string]: number;
  };
  totalExpenseRatio: number;
  entryCost: number;
  exitCost: number;
  ongoingCost: number;
  transactionCost: number;
  productDetails?: Array<{
    name: string;
    category: string;
    percentage: number;
    risk: number | null;
    horizon: number | null;
    entryCost: number;
    exitCost: number;
    ongoingCost: number;
    transactionCost: number;
  }>;
}

export default function AgentPage() {
  const { t } = useTranslation();
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
  
  // Email
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState<any>(null);

  // Portfolio
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [portfolioData, setPortfolioData] = useState<GeneratedPortfolio | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);

  // Stato per tracciare quali portafogli specifici sono stati salvati
  // Formato: { messageIndex: { portfolioIndex: true } }
  const [savedPortfolios, setSavedPortfolios] = useState<Record<number, Record<number, boolean>>>({});
  
  // Stato per tracciare quali portafogli sono in fase di salvataggio
  const [savingPortfolios, setSavingPortfolios] = useState<Record<string, boolean>>({});

  // Per retrocompatibilità
  const [savedPortfolioMessages, setSavedPortfolioMessages] = useState<number[]>([]);

  // Effetto per l'invio automatico del prompt di portfolio
  useEffect(() => {
    const autoSubmit = localStorage.getItem('autoSubmitPrompt');
    const portfolioPrompt = localStorage.getItem('portfolioCreationPrompt');
    
    if (autoSubmit === 'true' && portfolioPrompt) {
      // Impostiamo il prompt nel campo di input
      setInput(portfolioPrompt);
      
      // Rimuoviamo i flag per evitare invii multipli
      localStorage.removeItem('autoSubmitPrompt');
      localStorage.removeItem('portfolioCreationPrompt');
      
      // Inviamo il messaggio con un leggero ritardo per assicurarci che l'UI sia pronta
      setTimeout(() => {
        // Inviamo il messaggio dopo aver impostato il valore nell'input
        sendMessage();
      }, 500);
    }
  }, []);

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
      title: "Costruzione portafogli",
      description: "Crea portafogli personalizzati per i tuoi clienti basati sel loro profilo e preferenze",
      icon: <BarChart4 className="h-8 w-8 p-1.5" />,
      gradient: "from-emerald-500 to-teal-400"
    },
    {
      title: "Assistenza generale",
      description: "Supporto sull'app Gervis",
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
  
  // Check for portfolio creation prompt
  useEffect(() => {
    const portfolioPrompt = localStorage.getItem('portfolioCreationPrompt');
    // Controlla entrambi i flag per retrocompatibilità
    const autoSend = localStorage.getItem('autoSendPrompt') === 'true' || localStorage.getItem('autoSubmitPrompt') === 'true';
    const showUserMessage = localStorage.getItem('showUserMessage') === 'true';
    
    if (portfolioPrompt) {
      // Set up the UI for showing chat
      setShowChat(true);
      
      // Set the prompt to input and clear it from localStorage
      setInput(portfolioPrompt);
      localStorage.removeItem('portfolioCreationPrompt');
      localStorage.removeItem('autoSendPrompt');
      localStorage.removeItem('autoSubmitPrompt'); // Rimuovi anche il vecchio flag
      localStorage.removeItem('showUserMessage');
      
      // Se showUserMessage è true, aggiungi il messaggio utente alla chat
      if (showUserMessage) {
        const userMessage: Message = {
          content: portfolioPrompt,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
      }
      
      // Auto-send the message immediately if autoSend flag is true
      if (autoSend) {
        // Use a shorter delay to make it più veloce but still ensure UI is ready
      setTimeout(() => {
          handleDirectMessageSend(portfolioPrompt);
        }, 300);
      }
    }
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
          
        // Gestisci il dialog per la creazione di email se presente
        if (response.showEmailDialog && response.emailDialogData) {
          console.log('[Agent] Email dialog data:', response.emailDialogData);
          
          // Mostra direttamente il dialog di creazione email
          setEmailData(response.emailDialogData);
          setShowEmailDialog(true);
        }
          
        // Aggiorna la lista delle conversazioni
        fetchConversations();
        
        // Handle portfolio data if present
        if (response.data && response.data.functionResults && response.data.functionResults.length > 0) {
          console.log("Analisi functionResults per trovare portfolio data...");
          
          const portfolioResult = response.data.functionResults.find(
            (result: any) => result && (result.portfolio || result.success && result.suggestedResponse)
          );
          
          if (portfolioResult) {
            console.log("Trovato risultato portfolio:", portfolioResult);
            
            // Verifica se abbiamo un portfolio diretto
            if (portfolioResult.portfolio) {
              console.log("Trovato portfolio diretto:", portfolioResult.portfolio);
              setPortfolioData(portfolioResult.portfolio);
            }
            
            // Verifica se abbiamo metriche
            if (portfolioResult.portfolioMetrics) {
              console.log("Trovate metriche:", portfolioResult.portfolioMetrics);
              setPortfolioMetrics(portfolioResult.portfolioMetrics);
            }
            
            // Mostra il dialog solo se abbiamo dati utili
            if (portfolioResult.portfolio || (portfolioResult.success && portfolioResult.suggestedResponse)) {
              setShowPortfolioDialog(true);
            }
          } else {
            // Se non troviamo un oggetto con portfolio, cerchiamo nei messaggi
            console.log("Portfolio non trovato nei functionResults");
          }
        }
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
    // Verifica se è stata usata la funzione di generazione portfolio
    let isPortfolioGenerated = false;
    let portfoliosToSave: any[] = [];
    
    // Verifica se nei functionResults c'è il risultato della generazione portfolio
    if (message.functionResults && typeof message.functionResults === 'string') {
      try {
        // Se contiene la stringa "handlePortfolioGeneration", è stata usata la funzione di generazione
        isPortfolioGenerated = message.functionResults.includes('handlePortfolioGeneration') || 
                              message.functionResults.includes('generatePortfolio');
            
        // Estrai direttamente i dati del portfolio dai functionResults
        if (isPortfolioGenerated) {
          const results = JSON.parse(message.functionResults);
          
          // Caso 1: Se abbiamo un array di risultati di funzioni
          if (Array.isArray(results)) {
            // Trova i risultati delle funzioni di generazione portfolio
            const portfolioResults = results.filter(r => r && (r.portfolio || (r.result && r.result.portfolio)));
            
            // Estrai i dati di tutti i portafogli trovati
            portfolioResults.forEach(result => {
              if (result.portfolio) {
                portfoliosToSave.push(result.portfolio);
              } else if (result.result && result.result.portfolio) {
                portfoliosToSave.push(result.result.portfolio);
              }
            });
          }
          
          // Caso 2: Analisi del testo del messaggio per trovare portafogli multipli
          if (portfoliosToSave.length === 0 || portfoliosToSave.length === 1) {
            // Cerca nel testo dell'assistente per individuare più portafogli
            const portfolioSections = message.content.split(/Portafoglio \d+:|Portafoglio [A-Za-z]+ \d+:|Portafoglio [A-Za-z]+:/g).filter(Boolean);
            
            if (portfolioSections.length > 1) {
              // Abbiamo trovato almeno 2 portafogli separati nel testo
              // Usa il primo portfolio dei risultati come template e creane diversi, uno per ogni sezione
              if (portfoliosToSave.length === 1) {
                const templatePortfolio = portfoliosToSave[0];
                portfoliosToSave = [];
                
                // Estrai i nomi dei portafogli dal testo completo
                const portfolioNames: string[] = [];
                const nameMatches = message.content.match(/Portafoglio [\w\s]+:/g);
                if (nameMatches) {
                  nameMatches.forEach(match => {
                    portfolioNames.push(match.replace(':', '').trim());
                  });
                }
                
                // Crea un portafoglio per ogni sezione trovata
                portfolioSections.forEach((section, idx) => {
                  // Usa il nome estratto dal testo o assegna un nome predefinito
                  const portfolioName = idx < portfolioNames.length 
                    ? portfolioNames[idx] 
                    : `Portafoglio ${idx + 1}`;
                    
                  // Crea una copia del template con nome diverso
                  portfoliosToSave.push({
                    ...templatePortfolio,
                    name: portfolioName,
                    // La description potrebbe contenere la sezione di testo specifica
                    description: section.substring(0, 200) + '...',
                    // Manteniamo gli stessi dati di allocazione, ma in una implementazione
                    // reale dovremmo analizzare ciascuna sezione per estrarre i dati corretti
                  });
                });
              }
            }
          }
        }
        
        console.log("Portfolios estratti:", portfoliosToSave.length);
      } catch (e) {
        console.error('Errore nel parsing dei functionResults:', e);
      }
    }
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex gap-4 px-6 py-5 mb-1 ${
          message.role === 'user' 
            ? 'bg-white dark:bg-gray-950/50 border-l-4 border-blue-500 dark:border-blue-600' 
            : 'bg-white dark:bg-gray-950 border-l-4 border-indigo-500 dark:border-indigo-600'
        }`}
      >
        <div className="flex-shrink-0 pt-1">
          {message.role === 'user' ? (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <User className="h-4.5 w-4.5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="h-4.5 w-4.5" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-base">
              {message.role === 'user' ? 'Tu' : 'Gervis AI'}
            </span>
            {message.model && (
              <div className="flex flex-col">
                <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  {message.model === 'gpt-4.1' ? 'GPT-4.1' : 'GPT-4.1 Mini'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-1">
                  {message.model === 'gpt-4.1' ? 'Più potente e preciso' : 'Veloce ed efficiente'}
                </span>
              </div>
            )}
            {message.createdAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(message.createdAt)}
              </span>
            )}
            
            <div className="ml-auto">
              <Button
                variant="ghost"
                    size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => copyMessageContent(message.content, index)}
                  >
                    {copiedMessageIndex === index ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
            </div>
          </div>
            
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto break-words leading-relaxed">
            <div className="markdown-content rounded-md text-gray-700 dark:text-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeMarkdownText(message.content)}
              </ReactMarkdown>
            </div>
                  
            {/* Pulsanti per salvare i portfolio generati */}
            {isPortfolioGenerated && portfoliosToSave.length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center">
                  <ChartPieIcon className="h-4 w-4 mr-1.5" />
                  {portfoliosToSave.length > 1 ? `${portfoliosToSave.length} Portafogli generati` : 'Portafoglio generato'}
                </h3>
                
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                  {portfoliosToSave.length > 1 
                    ? 'Puoi salvare ciascun portafoglio nei tuoi modelli per utilizzarlo in futuro.' 
                    : 'Puoi salvare questo portafoglio nei tuoi modelli per utilizzarlo in futuro.'}
                </p>
                
                {/* Mostra un pulsante per ogni portafoglio */}
                <div className={portfoliosToSave.length > 1 ? "space-y-3" : ""}>
                  {portfoliosToSave.map((portfolio, portfolioIndex) => {
                    // Crea una chiave unica per questo portfolio
                    const portfolioKey = `${index}-${portfolioIndex}`;
                    
                    // Controlla se questo specifico portfolio è stato salvato
                    const isSaved = savedPortfolios[index]?.[portfolioIndex] === true;
                    
                    // Controlla se questo specifico portfolio è in fase di salvataggio
                    const isSaving = savingPortfolios[portfolioKey] === true;
                    
                    return (
                      <div 
                        key={portfolioIndex} 
                        className={portfoliosToSave.length > 1 ? "flex justify-between items-center border-b border-emerald-100 dark:border-emerald-900/30 pb-3 last:border-0" : ""}
                      >
                        {portfoliosToSave.length > 1 && (
                          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {portfolio.name || `Portafoglio ${portfolioIndex + 1}`}
                          </div>
                        )}
                        
                        {isSaved ? (
                          <div className="flex items-center text-emerald-600 dark:text-emerald-400 ml-auto">
                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                            <p className="text-sm">Salvato</p>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => directSavePortfolio(portfolio, index, portfolioIndex)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all transform hover:translate-y-[-1px] hover:shadow"
                            disabled={isSaving}
                            size={portfoliosToSave.length > 1 ? "sm" : "default"}
                    >
                            {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salva portafoglio
                        </>
                      )}
                    </Button>
                )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
                          
  const directSavePortfolio = async (portfolioData: any, messageIndex: number, portfolioIndex: number) => {
    // Crea una chiave unica per questo portfolio
    const portfolioKey = `${messageIndex}-${portfolioIndex}`;
    
    try {
      // Aggiorna lo stato solo per questo specifico portafoglio in salvataggio
      setSavingPortfolios(prev => ({
        ...prev,
        [portfolioKey]: true
      }));
      
      console.log("Salvando portfolio:", portfolioData);
      
      // Verifica che ci siano dati validi
      if (!portfolioData || !portfolioData.allocation || !Array.isArray(portfolioData.allocation)) {
        throw new Error('Dati del portafoglio mancanti o non validi');
      }
      
      // Genera assetAllocation raggruppando per categoria se è vuoto
      const assetAllocation = portfolioData.assetAllocation && portfolioData.assetAllocation.length > 0 
        ? portfolioData.assetAllocation 
        : generateAssetAllocation(portfolioData.allocation);
      
      // Prepara i dati per l'API nel formato corretto
      const portfolioToSave = {
        name: portfolioData.name || "Portfolio Bilanciato",
        description: portfolioData.description || "Portfolio generato automaticamente",
        clientProfile: portfolioData.clientProfile || "",
        riskLevel: portfolioData.riskLevel || "Medio",
        constructionLogic: portfolioData.generationLogic || "",
        
        // Salva tutte le metriche con nomi allineati al server
        averageRisk: portfolioData.averageRisk,
        averageTimeHorizon: portfolioData.averageDuration, // averageDuration nel frontend -> averageTimeHorizon nel server
        totalExpenseRatio: portfolioData.totalExpenseRatio, // totalExpenseRatio viene usato come totalAnnualCost nel server
        entryCost: portfolioData.entryCost,
        exitCost: portfolioData.exitCost,
        ongoingCost: portfolioData.ongoingCost,
        transactionCost: portfolioData.transactionCost,
        performanceFee: portfolioData.performanceFee || 0, // Usa il valore esistente o 0 come fallback
        assetAllocation: assetAllocation,
        
        // Usa i productId direttamente (rinominato in allocations per il controller)
        allocations: portfolioData.allocation
          .filter((item: any) => item && item.productId && item.percentage)
          .map((item: any) => ({
            productId: item.productId,
            isin: item.isin,
            name: item.name, 
            category: item.category,
            percentage: typeof item.percentage === 'string' ? 
              parseFloat(item.percentage) : 
              item.percentage
          }))
      };
      
      console.log("Invio dati al server:", portfolioToSave);

      // Invia i dati all'endpoint
      const response = await apiRequest('/api/model-portfolios', {
                                method: 'POST',
        body: JSON.stringify(portfolioToSave)
      });
      
                                if (response.success) {
        // Aggiorna il record dei portafogli salvati
        setSavedPortfolios(prev => {
          // Verifica se esiste già un oggetto per questo messageIndex
          const messagePortfolios = prev[messageIndex] || {};
          
          // Aggiorna l'oggetto per questo portfolio
          return {
            ...prev,
            [messageIndex]: {
              ...messagePortfolios,
              [portfolioIndex]: true
            }
          };
        });
        
        // Per retrocompatibilità, ma questo non verrà più usato per il controllo visivo
          setSavedPortfolioMessages(prev => [...prev, messageIndex]);
        
                                  toast({
          title: "Successo",
          description: "Il portafoglio è stato salvato con successo"
                                  });
        
        return true;
      } else {
        throw new Error(response.message || 'Errore durante il salvataggio del portafoglio');
                                }
    } catch (error) {
      console.error("Errore nel salvataggio del portafoglio:", error);
                                toast({
                                  title: "Errore",
        description: "Impossibile salvare il portafoglio: " + (error instanceof Error ? error.message : "Errore sconosciuto"),
                                  variant: "destructive",
                                });
      return false;
    } finally {
      // Rimuovi lo stato di salvataggio
      setSavingPortfolios(prev => {
        const newState = {...prev};
        delete newState[portfolioKey];
        return newState;
      });
    }
  };

  // Funzione di utilità per generare assetAllocation dall'allocation
  const generateAssetAllocation = (allocation: any[]) => {
    const categoryMap: {[key: string]: number} = {};
                            
    // Somma le percentuali per categoria
    allocation.forEach((item: any) => {
      if (item.category) {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = 0;
    }
        categoryMap[item.category] += item.percentage;
      }
    });
    
    // Converti in array di oggetti {category, percentage}
    return Object.entries(categoryMap).map(([category, percentage]) => ({
      category,
      percentage
    }));
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
                  className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-md transition-all relative"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="p-3">
                    <div>
                      <div className={`inline-flex rounded-full bg-gradient-to-r ${capability.gradient} p-1.5 text-white shadow-sm mb-2`}>
                        {capability.icon}
                      </div>
                      {index === 2 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 absolute top-3 right-3">
                          Beta
                        </span>
                      )}
                      
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
                              const message = "Mi ricordi che esigenze di investimentoo ha Francesca Bianchi?";
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
                            <div className="whitespace-normal overflow-hidden">Mi ricordi che esigenze di investimentoo ha Francesca Bianchi?</div>
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
                              const message = "Genera portafoglio modello per cliente Aggressivo";
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
                            <span className="whitespace-normal">Genera portafoglio modello per cliente Aggressivo</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs text-left px-2.5 py-1.5 h-auto min-h-[40px] border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm hover:shadow-md transition-all rounded-md overflow-hidden"
                                    onClick={() => {
                              const message = "Genera portafoglio modello per Francesca Bianchi";
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
                            <span className="whitespace-normal">Genera portafoglio modello per Francesca Bianchi</span>
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

  // Funzione per gestire l'invio dell'email
  const handleSendEmail = async (emailFormData: EmailFormData) => {
    try {
      console.log("Invio email con dati:", emailFormData);
      
      const response = await apiRequest('/api/emails', {
        method: 'POST',
        body: JSON.stringify(emailFormData)
      });
      
      if (response.success) {
        toast({
          title: "Email inviata",
          description: "L'email è stata inviata con successo",
        });
      } else {
        toast({
          title: "Errore",
          description: response.message || "Si è verificato un errore durante l'invio dell'email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nell'invio dell'email:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    } finally {
      setShowEmailDialog(false);
    }
  };

  // Handle direct message sending (used by example buttons)
  const handleDirectMessageSend = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
      setIsLoading(true);
    // Clear input after sending the message
    setInput('');
    
    // Verifica se abbiamo già aggiunto il messaggio utente
    const messageAlreadyAdded = messages.some(
      m => m.role === 'user' && m.content === message && 
      // Verifica che sia stato aggiunto recentemente (nell'ultimo secondo)
      m.createdAt && (new Date().getTime() - new Date(m.createdAt).getTime() < 1000)
    );
      
    // Aggiungi il messaggio dell'utente solo se non è già stato aggiunto
    if (!messageAlreadyAdded) {
      const userMessage: Message = {
        content: message,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
    }
    
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
        
        // Handle email dialog if present
        if (response.showEmailDialog && response.emailDialogData) {
          console.log('[Agent] Email dialog data:', response.emailDialogData);
          setEmailData(response.emailDialogData);
          setShowEmailDialog(true);
        }
        
        // Update conversations list
        fetchConversations();
      
      // Handle portfolio data if present
      if (response.data && response.data.functionResults && response.data.functionResults.length > 0) {
        console.log("Analisi functionResults per trovare portfolio data...");
        
        const portfolioResult = response.data.functionResults.find(
          (result: any) => result && (result.portfolio || result.success && result.suggestedResponse)
        );
        
        if (portfolioResult) {
          console.log("Trovato risultato portfolio:", portfolioResult);
          
          // Verifica se abbiamo un portfolio diretto
          if (portfolioResult.portfolio) {
            console.log("Trovato portfolio diretto:", portfolioResult.portfolio);
            setPortfolioData(portfolioResult.portfolio);
          }
          
          // Verifica se abbiamo metriche
          if (portfolioResult.portfolioMetrics) {
            console.log("Trovate metriche:", portfolioResult.portfolioMetrics);
            setPortfolioMetrics(portfolioResult.portfolioMetrics);
          }
          
          // Mostra il dialog solo se abbiamo dati utili
          if (portfolioResult.portfolio || (portfolioResult.success && portfolioResult.suggestedResponse)) {
            setShowPortfolioDialog(true);
          }
        } else {
          // Se non troviamo un oggetto con portfolio, cerchiamo nei messaggi
          console.log("Portfolio non trovato nei functionResults");
        }
      }
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
  <TooltipProvider>
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
            <h1 className="text-lg font-medium">Gervis AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Potente consulente finanziario AI</p>
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
      
      {/* Dialog per la creazione dell'email */}
      {emailData && (
        <EmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          clientId={emailData.clientId}
          title="Prepara un'email"
          presetSubject={emailData.subject || ""}
          presetMessage={emailData.content || ""}
          includeCustomFooter={true}
          useClientSelector={!emailData.clientId}
          onSubmit={handleSendEmail}
        />
      )}
    </div>
  </TooltipProvider>
  );
} 