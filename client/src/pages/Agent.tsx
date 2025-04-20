import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Sparkles, User, Loader2, Plus, MessageSquare, History, Trash2, RefreshCw, X, Mail, Calendar, Clock, MapPin, ExternalLink, ArrowRight, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Definisci le interfacce per i tipi di dati che gestiremo
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  clientSegment?: string;
  totalAssets?: number;
  isArchived?: boolean;
}

interface Meeting {
  id: number;
  subject: string;
  dateTime: string;
  formattedDate?: string;
  formattedTime?: string;
  duration: number;
  location?: string;
  notes?: string;
  client?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Message {
  id?: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt?: string;
  functionCalls?: any[];
  functionResults?: any[];
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Componente per mostrare un singolo cliente in una card
function ClientCard({ client, onClientClick, isNewlyCreated = false }: { client: Client; onClientClick?: (clientId: number) => void; isNewlyCreated?: boolean }) {
  const goToClientDetail = () => {
    if (onClientClick) {
      onClientClick(client.id);
    }
  };
  
  // Formatta il valore degli asset
  const formatAssets = (value?: number) => {
    if (value === undefined) return "N/D";
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Ottieni un colore per il segmento cliente
  const getSegmentColor = (segment?: string) => {
    if (!segment) return "bg-gray-200 text-gray-800";
    
    switch(segment) {
      case 'mass_market': return "bg-green-100 text-green-800";
      case 'affluent': return "bg-blue-100 text-blue-800";
      case 'hnw': return "bg-purple-100 text-purple-800";
      case 'vhnw': return "bg-pink-100 text-pink-800";
      case 'uhnw': return "bg-amber-100 text-amber-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };
  
  // Traduci il segmento cliente
  const getSegmentLabel = (segment?: string) => {
    if (!segment) return "Non specificato";
    
    switch(segment) {
      case 'mass_market': return "Mass Market";
      case 'affluent': return "Affluent";
      case 'hnw': return "High Net Worth";
      case 'vhnw': return "Very High Net Worth";
      case 'uhnw': return "Ultra High Net Worth";
      default: return segment;
    }
  };
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarFallback className="uppercase bg-blue-100 text-blue-700">
                {client.firstName?.[0]}{client.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{client.firstName} {client.lastName}</CardTitle>
              <CardDescription className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {client.email}
              </CardDescription>
            </div>
          </div>
          {client.isArchived && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Archiviato
            </Badge>
          )}
          {isNewlyCreated && (
            <Badge className="bg-green-100 text-green-800 border-green-300">
              Nuovo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {client.phone && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Phone className="h-3 w-3" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.clientSegment && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Badge className={getSegmentColor(client.clientSegment)}>
                {getSegmentLabel(client.clientSegment)}
              </Badge>
            </div>
          )}
        </div>
        {!isNewlyCreated && client.totalAssets !== undefined && (
          <div className="text-sm">
            <span className="font-semibold text-blue-700">Patrimonio:</span> {formatAssets(client.totalAssets)}
          </div>
        )}
        
        {isNewlyCreated && (
          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm">
            <p className="font-medium flex items-center mb-1">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Suggerimento
            </p>
            <p>Ricordati di procedere con l'onboarding del cliente per completare la sua registrazione.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToClientDetail}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        >
          Visualizza Profilo
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente per mostrare un singolo appuntamento in una card
function MeetingCard({ meeting, onClientClick }: { meeting: Meeting; onClientClick?: (clientId: number) => void }) {
  const goToClientDetail = () => {
    if (meeting.client?.id && onClientClick) {
      onClientClick(meeting.client.id);
    }
  };
  
  // Formatta la durata
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 pb-2 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-blue-800 dark:text-blue-300">{meeting.subject}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>{meeting.formattedDate || new Date(meeting.dateTime).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4 text-blue-600" />
          <span>{meeting.formattedTime || new Date(meeting.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-sm text-gray-500">({formatDuration(meeting.duration)})</span>
        </div>
        {meeting.location && (
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.client && (
          <div className="flex items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {meeting.client.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="font-medium">{meeting.client.name}</span>
            </div>
          </div>
        )}
      </CardContent>
      {meeting.client && onClientClick && (
        <CardFooter className="p-2 pt-0 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToClientDetail}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            Profilo Cliente
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Componente per mostrare una lista di appuntamenti in una card
function MeetingsList({ meetings, onClientClick }: { meetings: Meeting[]; onClientClick?: (clientId: number) => void }) {
  return (
    <Card className="w-full overflow-hidden shadow-md border border-blue-200/30 bg-white dark:bg-black/20">
      <CardHeader className="p-4 bg-blue-50/80 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/20">
        <CardTitle className="text-base text-blue-800 dark:text-blue-300 flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
          I tuoi appuntamenti
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {meetings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nessun appuntamento trovato
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {meetings.map((meeting) => {
              // Prepariamo i dati della data per formattazione migliore
              const meetingDate = new Date(meeting.dateTime);
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              // Determina se è oggi, domani o altro giorno
              const isToday = meetingDate.toDateString() === today.toDateString();
              const isTomorrow = meetingDate.toDateString() === tomorrow.toDateString();
              
              // Formatta l'etichetta della data in modo intelligente
              let dateLabel = meeting.formattedDate;
              if (isToday) dateLabel = "Oggi";
              if (isTomorrow) dateLabel = "Domani";
              
              return (
                <div key={meeting.id} className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                  <div className="flex items-start mb-2 justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">{meeting.subject}</h4>
                      {meeting.client && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <User className="h-3 w-3 mr-1 inline" />
                          {meeting.client.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600 bg-blue-100/50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full inline-block">
                        {dateLabel} • {meeting.formattedTime}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                      <span>{meeting.duration} min</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                  {meeting.client && onClientClick && (
                    <div className="mt-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onClientClick(meeting.client!.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 h-auto"
                      >
                        Profilo Cliente
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Esempio di capabilities dell'agente
  const capabilities = [
    { 
      title: "Ricerca Clienti", 
      description: "Trova rapidamente dettagli sui tuoi clienti e la loro storia" 
    },
    { 
      title: "Gestione Appuntamenti", 
      description: "Visualizza, pianifica e modifica appuntamenti con i clienti" 
    },
    { 
      title: "Analisi Dati", 
      description: "Ricevi insight e analisi sui tuoi clienti e portafoglio" 
    },
    { 
      title: "Assistenza", 
      description: "Ricevi supporto per utilizzare al meglio Gervis" 
    }
  ];
  
  // Animazioni introduttive
  useEffect(() => {
    if (showIntro) {
      const initialMessages: Message[] = [
        {
          role: 'system',
          content: 'BENVENUTO IN GERVIS',
          id: 1
        },
        {
          role: 'system',
          content: "L'UNICO AI AGENT DEDICATO AI CONSULENTI FINANZIARI",
          id: 2
        }
      ];
      
      // Aggiungi i messaggi uno alla volta con un ritardo
      let timer1 = setTimeout(() => {
        setMessages([initialMessages[0]]);
      }, 600);
      
      let timer2 = setTimeout(() => {
        setMessages([...initialMessages]);
      }, 2000);
      
      // Non nascondere automaticamente l'intro, lasciamo che l'utente clicchi su "Inizia"
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [showIntro]);
  
  // Carica le conversazioni esistenti
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Scorrimento automatico all'ultimo messaggio
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus automatico sull'input quando l'intro finisce
  useEffect(() => {
    if (!showIntro && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showIntro]);
  
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
  
  const loadConversation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/api/agent/conversations/${id}`);
      
      if (response.success) {
        setMessages(response.messages);
        setCurrentConversationId(id);
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
  
  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setIsConversationsOpen(false);
  };
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    try {
      // Aggiungi il messaggio dell'utente alla chat locale
      const userMessage: Message = {
        content: input,
        role: 'user'
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      
      // Invia il messaggio all'API
      const response = await apiRequest('/api/agent/message', {
        method: 'POST',
        body: JSON.stringify({
          message: input,
          conversationId: currentConversationId
        }),
      });
      
      if (response.success) {
        // Aggiorna l'ID della conversazione se è una nuova
        if (!currentConversationId) {
          setCurrentConversationId(response.conversationId);
        }
        
        // Aggiungi la risposta dell'assistente
        const assistantMessage: Message = {
          content: response.response,
          role: 'assistant',
          functionCalls: response.functionCalls,
          functionResults: response.functionResults
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        
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
  
  // Gestisce l'invio del messaggio con il tasto invio
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Formatta il timestamp
  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Formatta data e ora per l'elenco conversazioni
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Renderizza il messaggio iniziale con le capabilities
  const renderCapabilitiesMessage = () => {
    if (showIntro || messages.length > 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="flex mb-8 justify-start"
      >
        <div className="flex flex-row max-w-[90%]">
          <Avatar className="h-10 w-10 mr-4 mt-2">
            <AvatarFallback className="bg-blue-600 text-white"><Bot size={20} /></AvatarFallback>
          </Avatar>
          
          <motion.div 
            className="bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 backdrop-blur-md py-6 px-6 rounded-2xl border border-blue-300/20 shadow-lg"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          >
            <motion.h2 
              className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              Il tuo assistente personale per consulenza finanziaria
            </motion.h2>
            
            <motion.p 
              className="text-base mb-6 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              Ciao! Sono l'assistente Gervis, progettato specificamente per i consulenti finanziari. 
              Posso aiutarti a gestire clienti, appuntamenti e molto altro.
            </motion.p>
            
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {capabilities.map((cap, index) => (
                <motion.div 
                  key={index}
                  className="p-4 rounded-xl border border-blue-200/30 bg-white/10 dark:bg-black/20 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-black/30 transition-all cursor-pointer shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.03 }}
                >
                  <h3 className="font-medium text-blue-500 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {cap.title}
                  </h3>
                  <p className="text-sm opacity-80 mt-2">{cap.description}</p>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.p 
              className="text-sm mt-6 italic opacity-80 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              Come posso aiutarti oggi?
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    );
  };
  
  // Renderizza messaggio introduttivo con pulsante
  const renderIntroScreen = () => {
    return (
      <motion.div
        key="intro-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center h-full w-full"
      >
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          {messages.map(renderMessage)}
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.5 }}
            className="mt-12"
          >
            <Button 
              size="lg" 
              onClick={() => {
                setShowIntro(false);
                setMessages([]);
                setCurrentConversationId(undefined);
              }}
              className="px-10 py-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <motion.span 
                className="text-white text-lg font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Inizia
              </motion.span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  };
  
  // Renderizza un messaggio
  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    if (isSystem) {
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 w-full"
        >
          <motion.div 
            className="font-bold text-4xl sm:text-6xl md:text-7xl inline-block py-3 px-4 bg-gradient-to-r from-[#0035a4] via-[#3a5de2] to-[#6d68e4] bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            {message.content}
          </motion.div>
        </motion.div>
      );
    }
    
    // Controlla se abbiamo risultati da visualizzare come card strutturate
    const functionResults = message.functionResults || [];
    const hasResults = functionResults.length > 0;
    const functionResult = hasResults ? functionResults[0] : null;
    
    // Determina il tipo di risultato
    const hasClientResults = functionResult && 'clients' in functionResult && Array.isArray(functionResult.clients) && functionResult.clients.length > 0;
    const hasMeetingResults = functionResult && 'meetings' in functionResult && Array.isArray(functionResult.meetings) && functionResult.meetings.length > 0;
    const hasCreatedClient = functionResult && 'success' in functionResult && functionResult.success && 'client' in functionResult && functionResult.client;
    const hasCreatedMeeting = functionResult && 'success' in functionResult && functionResult.success && 'meeting' in functionResult && functionResult.meeting;
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
          <Avatar className={`h-10 w-10 ${isUser ? 'ml-4' : 'mr-4'} flex-shrink-0`}>
            <AvatarFallback className={isUser ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}>
              {isUser ? <User size={20} /> : <Bot size={20} />}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className={`
              py-3 px-4 rounded-2xl
              ${isUser 
                ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white' 
                : 'bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-blue-200/20'}
            `}>
              <div className="text-base whitespace-pre-wrap break-words">{message.content}</div>
              
              {message.createdAt && (
                <div className="text-xs opacity-70 mt-1 text-right">
                  {formatTimestamp(message.createdAt)}
                </div>
              )}
              
              {message.functionCalls && message.functionCalls.length > 0 && 
                (!message.functionResults || message.functionResults.length === 0) && (
                <div className="mt-2 text-xs opacity-70 italic flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Elaborazione in corso...
                </div>
              )}
            </div>
            
            {/* Visualizzazione dei risultati della ricerca di clienti */}
            {hasClientResults && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mb-2"
              >
                <h3 className="text-base font-medium text-blue-800 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {functionResult.count} clienti trovati
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {functionResult.clients.map((client: Client) => (
                    <ClientCard key={client.id} client={client} onClientClick={handleClientClick} isNewlyCreated={false} />
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Visualizzazione dei risultati della ricerca di appuntamenti */}
            {hasMeetingResults && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mb-2 w-full"
              >
                <h3 className="text-base font-medium text-blue-800 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {functionResult.count} appuntamenti trovati
                </h3>
                
                <Card className="w-full overflow-hidden shadow-md border border-blue-200/30 bg-white dark:bg-black/20">
                  <CardHeader className="p-4 bg-blue-50/80 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/20">
                    <CardTitle className="text-base text-blue-800 dark:text-blue-300 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                      I tuoi appuntamenti
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {functionResult.meetings.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        Nessun appuntamento trovato
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {functionResult.meetings.map((meeting: Meeting) => {
                          // Prepariamo i dati della data per formattazione migliore
                          const meetingDate = new Date(meeting.dateTime);
                          const today = new Date();
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          
                          // Determina se è oggi, domani o altro giorno
                          const isToday = meetingDate.toDateString() === today.toDateString();
                          const isTomorrow = meetingDate.toDateString() === tomorrow.toDateString();
                          
                          // Formatta l'etichetta della data in modo intelligente
                          let dateLabel = meeting.formattedDate;
                          if (isToday) dateLabel = "Oggi";
                          if (isTomorrow) dateLabel = "Domani";
                          
                          return (
                            <div key={meeting.id} className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                              <div className="flex items-start mb-2 justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-blue-800 dark:text-blue-300">{meeting.subject}</h4>
                                  {meeting.client && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                      <User className="h-3 w-3 mr-1 inline" />
                                      {meeting.client.name}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-blue-600 bg-blue-100/50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full inline-block">
                                    {dateLabel} • {meeting.formattedTime}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                  <span>{meeting.duration} min</span>
                                </div>
                                {meeting.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                    <span>{meeting.location}</span>
                                  </div>
                                )}
                              </div>
                              {meeting.client && (
                                <div className="mt-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => meeting.client && handleClientClick(meeting.client.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 h-auto"
                                  >
                                    Profilo Cliente
                                    <ArrowRight className="ml-1 h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {/* Visualizzazione del cliente appena creato */}
            {hasCreatedClient && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mb-2"
              >
                <h3 className="text-base font-medium text-green-800 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Cliente creato con successo
                </h3>
                <div className="border-l-4 border-green-500 pl-4">
                  <ClientCard client={functionResult.client} onClientClick={handleClientClick} isNewlyCreated={hasCreatedClient} />
                </div>
              </motion.div>
            )}
            
            {/* Visualizzazione dell'appuntamento appena creato */}
            {hasCreatedMeeting && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 mb-2"
              >
                <h3 className="text-base font-medium text-green-800 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Appuntamento creato con successo
                </h3>
                <div className="border-l-4 border-green-500 pl-4">
                  <MeetingCard meeting={functionResult.meeting} onClientClick={handleClientClick} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Funzione per gestire la navigazione verso la pagina del cliente tramite window.location
  const handleClientClick = (clientId: number) => {
    // Apre in una nuova scheda/finestra
    window.open(`/clients/${clientId}`, '_blank');
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
      <AnimatePresence>
        {isConversationsOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-16 right-0 w-80 h-[calc(100vh-80px)] bg-white/90 dark:bg-black/90 backdrop-blur-md border-l z-20 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Le tue conversazioni</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsConversationsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {isLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Caricamento...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nessuna conversazione
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <Button
                      key={conversation.id}
                      variant={currentConversationId === conversation.id ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => loadConversation(conversation.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="truncate flex-1">
                        <div className="font-medium truncate">{conversation.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(conversation.updatedAt)}
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Area messaggi */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {showIntro ? (
              renderIntroScreen()
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                {messages.map(renderMessage)}
                {renderCapabilitiesMessage()}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Input area */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: showIntro ? 100 : 0, opacity: showIntro ? 0 : 1 }}
        transition={{ delay: showIntro ? 0 : 0.5, duration: 0.5 }}
        className="p-4 border-t bg-white/70 dark:bg-black/70 backdrop-blur-md"
      >
        <div className="max-w-4xl mx-auto relative">
          <Input
            ref={inputRef}
            placeholder="Scrivi un messaggio..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || showIntro}
            className="pr-12 py-6 bg-white/70 dark:bg-black/40 border-blue-200/30 focus-visible:ring-blue-500"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim() || showIntro}
            size="icon"
            className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isLoading ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              <Send className="h-4 w-4" />
            }
          </Button>
        </div>
      </motion.div>
    </div>
  );
} 