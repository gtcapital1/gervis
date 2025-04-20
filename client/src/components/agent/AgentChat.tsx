import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id?: number;
  content: string;
  role: 'user' | 'assistant';
  createdAt?: string;
  functionCalls?: any[];
  functionResults?: any[];
}

interface AgentChatProps {
  conversationId?: number;
  initialMessages?: Message[];
  className?: string;
}

export default function AgentChat({ conversationId, initialMessages = [], className = '' }: AgentChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scorrimento automatico all'ultimo messaggio
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Se viene fornito un conversationId, carica la conversazione
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);
  
  // Carica una conversazione esistente
  const loadConversation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/api/agent/conversations/${id}`);
      
      if (response.success) {
        setMessages(response.messages);
        setCurrentConversationId(id);
      } else {
        toast({
          title: "Errore",
          description: "Impossibile caricare la conversazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore nel caricamento della conversazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nel caricamento della conversazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Invia un messaggio all'agente
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
  
  // Renderizza un singolo messaggio
  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={index}
        className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%]`}>
          <Avatar className={`h-8 w-8 ${isUser ? 'ml-2' : 'mr-2'}`}>
            <AvatarFallback>{isUser ? <User size={18} /> : <Bot size={18} />}</AvatarFallback>
          </Avatar>
          
          <div className={`
            py-2 px-3 rounded-lg
            ${isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'}
          `}>
            <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
            
            {message.createdAt && (
              <div className="text-xs opacity-70 mt-1 text-right">
                {formatTimestamp(message.createdAt)}
              </div>
            )}
            
            {message.functionCalls && message.functionCalls.length > 0 && (
              <div className="mt-2 text-xs opacity-70 italic">
                Ricerca in corso...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <Bot className="mr-2" /> Gervis Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-4 opacity-70">
              <div>
                <Bot size={40} className="mx-auto mb-4 opacity-50" />
                <p>Ciao, sono Gervis Assistant!</p>
                <p className="text-sm mt-2">
                  Posso aiutarti a cercare clienti, gestire appuntamenti e molto altro.
                </p>
              </div>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Scrivi un messaggio..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 