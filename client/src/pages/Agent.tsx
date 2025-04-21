import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Sparkles, Calendar, Mail, FileText, Users, BarChart4, Brain, Send, User, Plus, History, X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Tipo per i messaggi della chat
interface Message {
  content: string;
  role: 'user' | 'assistant' | 'system';
  id?: number;
  createdAt?: string;
  model?: string;
}

// Tipo per le conversazioni
interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

export default function AgentPage() {
  const { toast } = useToast();
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
  const [currentModel, setCurrentModel] = useState<'gpt-4.1-mini' | 'gpt-4.1'>('gpt-4.1-mini');

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
    DEFAULT: 'gpt-4.1-mini' as const,
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
          model: response.model || currentModel
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
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
  
  // Renderizza un messaggio
  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
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
            py-3 px-4 rounded-2xl 
            ${isUser 
              ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white' 
              : 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700'}
          `}>
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              {/* Mostra il modello utilizzato per messaggi dell'assistente */}
              {!isUser && message.model && (
                <div className="text-xs opacity-70">
                  <span className="inline-flex items-center">
                    <Sparkles className="h-3 w-3 mr-1 opacity-70" />
                    Generato con {message.model}
                  </span>
                </div>
              )}
              
              {message.createdAt && (
                <div className="text-xs opacity-70 text-right ml-auto">
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
                  <p className="text-sm text-muted-foreground">Il tuo assistente personale per consulenza finanziaria</p>
                </div>
              </div>
            </motion.div>
          )}

          {!showChat && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full mb-6">
              {capabilities.map((capability, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                  className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-md transition-all"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="p-4">
                    <div className={`inline-flex rounded-full bg-gradient-to-r ${capability.gradient} p-1.5 text-white shadow-sm mb-3`}>
                      {capability.icon}
                    </div>
                    
                    <h3 className="text-base font-medium mb-2 flex items-center">
                      {capability.title}
                      <Sparkles className="h-4 w-4 ml-1.5 text-blue-500" />
                    </h3>
                    
                    <p className="text-sm text-muted-foreground">{capability.description}</p>
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
                      Modello in uso: {currentModel === AVAILABLE_MODELS.DEFAULT ? 'Standard' : 'Avanzato'}
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
            {/* Selettore di modello */}
            <div className="flex justify-center max-w-6xl mx-auto mb-4">
              <div className="flex flex-col items-center gap-1">
                <div className="text-sm font-medium mb-1">Seleziona il modello AI</div>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentModel(AVAILABLE_MODELS.DEFAULT)}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                      currentModel === AVAILABLE_MODELS.DEFAULT
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
            </div>
            
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
    </div>
  );
} 