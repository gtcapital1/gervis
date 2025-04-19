import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Camera, Upload, Check, AlertTriangle, FileText, Smartphone, ScrollText, ExternalLink, Laptop, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Steps, Step } from "@/components/ui/stepper";
import { QRCodeSVG } from "qrcode.react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function MobileVerification() {
  const { sessionId } = useParams();
  const [location] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token') || '';
  
  console.log('[DEBUG URGENTE] MobileVerification componente inizializzato con:', {
    currentSessionId: sessionId,
    token: token,
    location: window.location.href,
    searchParams: window.location.search
  });
  
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed' | 'mobile_complete'>('pending');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Nuovi stati per i consensi
  const [readAndApproved, setReadAndApproved] = useState(false);
  const [understoodAndAccepted, setUnderstoodAndAccepted] = useState(false);
  
  // Crea un canale di comunicazione per scambiare dati tra finestre
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);
  
  // State per gestire la disponibilità della fotocamera
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  
  // State per la webcam
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Controlla se tutti i consensi sono stati accettati
  const allConsentsAccepted = readAndApproved && understoodAndAccepted;
  
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  
  // Nuovo stato per tracciare la preferenza dell'utente
  const [devicePreference, setDevicePreference] = useState<'desktop' | 'mobile' | null>(null);
  
  // Check if user is on desktop
  useEffect(() => {
    // Simple detection based on screen width and user agent
    const checkIfDesktop = () => {
      // Più affidabile: considera solo la larghezza dello schermo, non l'user agent
      const isSmallScreen = window.innerWidth < 768;
      console.log('Rilevamento dispositivo:', {
        larghezzaSchermo: window.innerWidth,
        userAgent: navigator.userAgent,
        isSmallScreen
      });
      return !isSmallScreen;
    };
    
    setIsDesktop(checkIfDesktop());
    console.log('Dispositivo rilevato come:', checkIfDesktop() ? 'desktop' : 'mobile');
    
    // Recheck on resize
    const handleResize = () => {
      const newIsDesktop = checkIfDesktop();
      console.log('Cambio dimensione finestra, nuovo stato:', newIsDesktop ? 'desktop' : 'mobile');
      setIsDesktop(newIsDesktop);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Funzione per forzare la modalità desktop
  const forceDesktopMode = () => {
    console.log('Modalità desktop forzata manualmente');
    setIsDesktop(true);
  };

  // Funzione per forzare la modalità mobile
  const forceMobileMode = () => {
    console.log('Modalità mobile forzata manualmente');
    setIsDesktop(false);
  };
  
  // Fetch session data on mount
  useEffect(() => {
    const fetchSessionData = async () => {
      console.log('[DEBUG URGENTE] Inizio fetchSessionData con:', {
        sessionId, 
        token,
        timestamp: new Date().toISOString()
      });
      
      if (!sessionId || !token) {
        console.log('[DEBUG URGENTE] Parametri mancanti, non eseguo la richiesta');
        toast({
          title: "Errore",
          description: "Sessione non valida. Riprova.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        console.log('[DEBUG URGENTE] Eseguo richiesta a:', `/api/signature-sessions/${sessionId}?token=${token}`);
        const response = await fetch(`/api/signature-sessions/${sessionId}?token=${token}`);
        if (!response.ok) {
          console.log('[DEBUG URGENTE] Risposta non valida:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error('Invalid session');
        }
        
        const data = await response.json();
        
        // Log dettagliato della risposta completa
        console.log('[DEBUG URGENTE] Risposta completa dal server:', JSON.stringify(data, null, 2));
        
        // Aggiungiamo log di debug per documentUrl
        console.log('[DEBUG MobileVerification] Dati sessione ricevuti:', {
          sessionId,
          sessionValid: data.sessionValid,
          hasDocumentUrl: !!data.documentUrl,
          documentUrl: data.documentUrl,
          documentUrlType: typeof data.documentUrl
        });
        
        // Se c'è un documentUrl, proviamo ad accedervi direttamente e a verificare se è accessibile
        if (data.documentUrl) {
          console.log('[DEBUG MobileVerification] Proveremo ad accedere al documento:', data.documentUrl);
          
          // Verifichiamo se il percorso è in formato /client/public/...
          if (data.documentUrl.startsWith('/client/public/')) {
            // Suggeriamo un path alternativo senza il prefisso
            const alternativePath = data.documentUrl.replace(/^\/client\/public\//, '/');
            console.log('[DEBUG MobileVerification] Il percorso inizia con /client/public/, potrebbe essere necessario usare invece:', alternativePath);
          }
        }
        
        setSessionData(data);
      } catch (error) {
        console.error('[DEBUG MobileVerification] Errore nel recupero dati sessione:', error);
        toast({
          title: "Errore",
          description: "Sessione non valida o scaduta. Richiedi un nuovo link.",
          variant: "destructive"
        });
      }
    };
    
    fetchSessionData();
  }, [sessionId, token, toast]);
  
  // Aggiungiamo un nuovo useEffect per gestire i log del documentUrl
  useEffect(() => {
    if (sessionData) {
      console.log('[DEBUG MobileVerification] Dati sessione elaborati:', {
        hasDocumentUrl: !!sessionData.documentUrl,
        documentUrl: sessionData.documentUrl
      });
      
      if (sessionData.documentUrl) {
        if (sessionData.documentUrl.startsWith('/client/public/')) {
          console.log('[DEBUG MobileVerification] L\'URL del documento inizia con /client/public/, potrebbe essere necessario rimuovere questo prefisso.');
        }
      }
    }
  }, [sessionData]);
  
  // Aggiungiamo una funzione per elaborare l'URL del documento
  const getProcessedDocumentUrl = (url: string | undefined) => {
    console.log('[DEBUG URGENTE] getProcessedDocumentUrl chiamata con URL:', url);
    
    if (!url) {
      console.log('[DEBUG URGENTE] URL vuoto o undefined, restituisco stringa vuota');
      return '';
    }
    
    // Se l'URL inizia con /client/public/, rimuoviamo questo prefisso
    if (url.startsWith('/client/public/')) {
      const processedUrl = url.replace(/^\/client\/public\//, '/');
      console.log('[DEBUG URGENTE] URL documento elaborato da:', url, 'a:', processedUrl);
      return processedUrl;
    }
    
    // Se l'URL è già un endpoint API sicuro (/api/secured-files/), lo usiamo direttamente
    // Aggiungiamo il token come parametro di query per l'autenticazione
    if (url.startsWith('/api/secured-files/')) {
      const tokenParam = token ? `?token=${token}` : '';
      const processedUrl = `${url}${tokenParam}`;
      console.log('[DEBUG URGENTE] URL documento API sicuro elaborato:', processedUrl);
      return processedUrl;
    }
    
    console.log('[DEBUG URGENTE] URL documento non modificato:', url);
    return url;
  };
  
  // Handle file uploads
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement> | File, type: 'front' | 'back' | 'selfie') => {
    let file: File | null = null;
    
    if (event instanceof File) {
      // Se è un File diretto
      file = event;
    } else if (event.target.files && event.target.files[0]) {
      // Se è un evento da input
      file = event.target.files[0];
    }
    
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "La dimensione massima del file è 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Store the file in the appropriate state variable
    switch (type) {
      case 'front':
        setIdFront(file);
        console.log('Documento fronte caricato:', file.name);
        toast({
          title: "Documento caricato",
          description: `Fronte del documento caricato: ${file.name}`,
        });
        break;
      case 'back':
        setIdBack(file);
        console.log('Documento retro caricato:', file.name);
        toast({
          title: "Documento caricato",
          description: `Retro del documento caricato: ${file.name}`,
        });
        break;
      case 'selfie':
        setSelfie(file);
        console.log('Selfie caricato:', file.name);
        toast({
          title: "Selfie acquisito",
          description: "Selfie caricato con successo",
        });
        break;
    }
  };
  
  // Aggiungiamo useEffect per il debug
  useEffect(() => {
    console.log('Stato caricamenti:', { 
      idFront: idFront ? 'caricato' : 'non caricato', 
      idBack: idBack ? 'caricato' : 'non caricato',
      selfie: selfie ? 'caricato' : 'non caricato',
      currentStep,
      isDesktop
    });
  }, [idFront, idBack, selfie, currentStep, isDesktop]);
  
  // Move to next step
  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };
  
  // Move to previous step
  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };
  
  // Submit verification data
  const submitVerification = async () => {
    if (!idFront || !idBack || !selfie) {
      toast({
        title: "Dati mancanti",
        description: "Carica tutti i documenti richiesti",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Ottieni il token anche dai parametri di query, nel caso in cui non sia disponibile nel componente
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = token || urlParams.get('token') || '';
      
      // Log per debug
      console.log('Token usato per la verifica:', urlToken);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('idFront', idFront);
      formData.append('idBack', idBack);
      formData.append('selfie', selfie);
      formData.append('sessionId', sessionId || '');
      formData.append('token', urlToken);
      
      // Send to verification API
      const response = await fetch(`/api/verify-identity?token=${urlToken}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      
      // Process response
      const result = await response.json();
      
      // Aggiungiamo un log dettagliato della risposta
      console.log('[DEBUG DETTAGLIATO] Risposta completa dalla verifica:', result);
      
      if (result.success) {
        setVerificationStatus('success');
        toast({
          title: "Verifica completata",
          description: "Identità verificata con successo"
        });
      } else {
        setVerificationStatus('failed');
        console.log('[DEBUG DETTAGLIATO] Verifica fallita:', result.message);
        toast({
          title: "Verifica fallita",
          description: result.message || "Non è stato possibile verificare l'identità",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.log('[DEBUG DETTAGLIATO] Errore durante la verifica:', error);
      setVerificationStatus('failed');
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la verifica. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Genera URL per QR code con supporto per sviluppo locale
  const generateMobileUrl = () => {
    // Verifica se siamo in ambiente di sviluppo (localhost)
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
    
    // Mantieni lo stesso URL ma aggiungi il parametro selfieStep
    const url = new URL(window.location.href);
    url.searchParams.set('selfieStep', 'true');
    
    // Aggiungi esplicitamente il token all'URL del QR code
    if (token) {
      url.searchParams.set('token', token);
    }
    
    if (isLocalDevelopment) {
      // Usa l'IP locale 192.168.1.7 quando si è in sviluppo locale
      const localIP = '192.168.1.7:5000';
      const path = window.location.pathname + '?' + url.searchParams.toString();
      return `http://${localIP}${path}`;
    } else {
      // Altrimenti usa l'URL corrente modificato
      return url.toString();
    }
  };
  
  // Controlla se l'utente è arrivato qui direttamente per fare il selfie
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSelfieStep = urlParams.get('selfieStep');
    
    if (isSelfieStep === 'true' && !isDesktop) {
      // Se è arrivato per fare il selfie da mobile, vai direttamente allo step selfie
      setCurrentStep(1);
    }
  }, [isDesktop]);
  
  // Inizializza il canale di comunicazione
  useEffect(() => {
    if (sessionId && token) {
      try {
        const channelId = `selfie_channel_${sessionId}`;
        const channel = new BroadcastChannel(channelId);
        
        console.log('Canale di comunicazione creato:', channelId);
        
        // Listener per ricevere messaggi
        channel.onmessage = (event) => {
          console.log('Messaggio ricevuto sul canale broadcast:', event.data);
          
          if (event.data && event.data.type === 'selfie_sent' && event.data.base64) {
            // Converti il base64 in blob e poi in File
            fetch(event.data.base64)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                console.log('Selfie ricevuto tramite broadcast channel');
                setSelfie(file);
                
                toast({
                  title: "Selfie ricevuto",
                  description: "Selfie ricevuto dal dispositivo mobile. Clicca 'Continua' per procedere."
                });
              })
              .catch(err => {
                console.error('Errore nella conversione del selfie:', err);
              });
          }
        };
        
        setBroadcastChannel(channel);
        
        // Cleanup al dismount
        return () => {
          console.log('Chiusura canale broadcast');
          channel.close();
        };
      } catch (error) {
        console.error('Errore nella creazione del broadcast channel:', error);
      }
    }
  }, [sessionId, token, toast]);
  
  // Simuliamo l'invio e la ricezione del selfie tra dispositivi
  const transferSelfieFromMobile = async () => {
    try {
      if (selfie) {
        setIsLoading(true);
        console.log('Inizio trasferimento selfie da mobile a desktop');
        
        // Creiamo un canvas per ridimensionare l'immagine e ridurne le dimensioni
        const img = new Image();
        img.onload = function() {
          console.log('Immagine caricata, inizio compressione');
          // Creiamo un canvas con dimensioni molto ridotte
          const canvas = document.createElement('canvas');
          // Ridimensioniamo l'immagine a dimensioni piccole ma riconoscibili
          const maxSize = 150; // Dimensione massima in pixel - ulteriormente ridotta
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // Disegniamo l'immagine ridimensionata
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Usiamo una qualità molto bassa per ridurre dimensioni
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.2);
            console.log('Immagine compressa. Dimensione approssimativa:', Math.round(compressedDataUrl.length / 1024), 'KB');
            
            // Identificatore univoco per questa sessione - usiamo SOLO sessionId che è sicuramente disponibile
            const sessionKey = `selfie_${sessionId}`;
            console.log('Salvando con chiave di sessione:', sessionKey);
            
            // Timestamp per tracciare quando è stato salvato il selfie
            const timestamp = new Date().toISOString();
            
            // Salva il selfie con un marcatore temporale
            try {
              // APPROCCIO 1: localStorage (più persistente)
              localStorage.setItem(sessionKey, compressedDataUrl);
              localStorage.setItem(`${sessionKey}_time`, timestamp);
              console.log('Selfie salvato in localStorage con chiave:', sessionKey);
              
              // APPROCCIO 2: sessionStorage (meno persistente ma più disponibile)
              sessionStorage.setItem(sessionKey, compressedDataUrl);
              sessionStorage.setItem(`${sessionKey}_time`, timestamp);
              console.log('Selfie salvato in sessionStorage con chiave:', sessionKey);
              
              // APPROCCIO 3: BroadcastChannel (comunicazione diretta tra tab)
              if (broadcastChannel) {
                console.log('Invio selfie tramite BroadcastChannel');
                broadcastChannel.postMessage({
                  type: 'selfie_sent',
                  base64: compressedDataUrl,
                  timestamp
                });
              }
              
              // Notifica utente
              toast({
                title: "Selfie inviato",
                description: "Selfie trasferito con successo. Torna al desktop e attendi qualche secondo.",
              });
              
              // Mostriamo un messaggio di conferma
              setVerificationStatus('mobile_complete');
            } catch (storageError) {
              console.error('Errore nel salvare il selfie:', storageError);
              
              // Se fallisce lo storage, prova solo il broadcast
              if (broadcastChannel) {
                console.log('Tentativo con solo BroadcastChannel');
                broadcastChannel.postMessage({
                  type: 'selfie_sent',
                  base64: compressedDataUrl,
                  timestamp
                });
                
                toast({
                  title: "Selfie inviato",
                  description: "Selfie trasferito con metodo alternativo. Torna al desktop.",
                });
                
                setVerificationStatus('mobile_complete');
              } else {
                throw new Error('Tutti i metodi di trasferimento hanno fallito');
              }
            }
          }
          
          setIsLoading(false);
        };
        
        // Carica l'immagine nel canvas
        img.src = URL.createObjectURL(selfie);
      }
    } catch (error) {
      console.error('Errore nel trasferimento del selfie:', error);
      toast({
        title: "Errore",
        description: "Impossibile trasferire il selfie. Prova di nuovo o ricarica la pagina sul desktop.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  // Controlla periodicamente se è arrivato un selfie dal mobile
  useEffect(() => {
    // Solo se siamo in desktop e nello step selfie (1) e non abbiamo già un selfie
    if (isDesktop && currentStep === 1 && !selfie) {
      console.log('Avvio monitoraggio per selfie dal mobile...');
      
      // Identificatore univoco per questa sessione - usiamo SOLO sessionId che è sicuramente disponibile
      const sessionKey = `selfie_${sessionId}`;
      console.log('Chiave di sessione per selfie:', sessionKey);
      
      // Funzione per processare il selfie trovato
      const processSelfie = async (storedSelfie: string, source: string) => {
        try {
          console.log(`Selfie trovato in ${source}! Elaborazione...`);
          
          // Converti il base64 in Blob
          const response = await fetch(storedSelfie);
          const blob = await response.blob();
          
          // Crea un File dal Blob
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          console.log('Selfie convertito in File');
          
          // Imposta il selfie
          setSelfie(file);
          
          // Notifica l'utente
          toast({
            title: "Selfie ricevuto",
            description: `Selfie ricevuto dal dispositivo mobile (via ${source})`,
          });
          
          // Pulizia - rimuovi dal storage per evitare riutilizzo
          try {
            localStorage.removeItem(sessionKey);
            localStorage.removeItem(`${sessionKey}_time`);
            sessionStorage.removeItem(sessionKey);
            sessionStorage.removeItem(`${sessionKey}_time`);
            console.log('Storage pulito dopo ricezione selfie');
          } catch (e) {
            console.error('Errore nella pulizia dello storage:', e);
          }
        } catch (error) {
          console.error('Errore nel recupero del selfie:', error);
        }
      };
      
      // Prima controlla subito se c'è già un selfie in localStorage o sessionStorage
      let storedSelfieLocal = localStorage.getItem(sessionKey);
      let storedSelfieSession = sessionStorage.getItem(sessionKey);
      
      if (storedSelfieLocal) {
        console.log('Selfie trovato immediatamente in localStorage!');
        processSelfie(storedSelfieLocal, 'localStorage');
        return;
      }
      
      if (storedSelfieSession) {
        console.log('Selfie trovato immediatamente in sessionStorage!');
        processSelfie(storedSelfieSession, 'sessionStorage');
        return;
      }
      
      console.log('Nessun selfie trovato immediatamente, inizio polling...');
      
      // Se non c'è, imposta un intervallo per controllare periodicamente
      const checkInterval = setInterval(() => {
        console.log('Controllo selfie...');
        
        // Controlla in localStorage
        const storedSelfieLocal = localStorage.getItem(sessionKey);
        if (storedSelfieLocal) {
          console.log('Selfie trovato in localStorage durante polling!');
          processSelfie(storedSelfieLocal, 'localStorage');
          clearInterval(checkInterval);
          return;
        }
        
        // Controlla in sessionStorage
        const storedSelfieSession = sessionStorage.getItem(sessionKey);
        if (storedSelfieSession) {
          console.log('Selfie trovato in sessionStorage durante polling!');
          processSelfie(storedSelfieSession, 'sessionStorage');
          clearInterval(checkInterval);
          return;
        }
        
        console.log('Nessun selfie trovato in questa iterazione.');
      }, 1000); // Controlla ogni secondo
      
      return () => {
        console.log('Pulizia monitor selfie');
        clearInterval(checkInterval);
      };
    }
  }, [isDesktop, currentStep, sessionId, toast, selfie]);

  // Controllo disponibilità della fotocamera
  useEffect(() => {
    // Imposta sempre hasCamera su true, poiché useremo sempre il mobile
    setHasCamera(true);
    console.log('Camera detection disabilitata, impostata su disponibile');
  }, []);
  
  // Vecchio controllo fotocamera, disabilitato
  /*
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        // Richiedi permesso alla fotocamera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Fotocamera disponibile');
        // Rilascia lo stream subito dopo il controllo
        stream.getTracks().forEach(track => track.stop());
        setHasCamera(true);
      } catch (err) {
        console.log('Fotocamera non disponibile:', err);
        setHasCamera(false);
      }
    };
    
    checkCameraAvailability();
  }, []);
  */
  
  // Aggiungi un pulsante per ricaricare la pagina quando si attende il selfie
  const reloadPage = () => {
    window.location.reload();
  };
  
  // Funzione per avviare la webcam
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", // Forza la fotocamera frontale
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Errore nell\'avvio della fotocamera:', err);
      setHasCamera(false); // Se fallisce, imposta hasCamera a false
      setIsCapturing(false);
      toast({
        title: "Errore Fotocamera",
        description: "Non è stato possibile accedere alla fotocamera. Usa il QR code per continuare su un altro dispositivo.",
        variant: "destructive"
      });
    }
  };
  
  // Funzione per fermare la webcam
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCapturing(false);
    }
  };
  
  // Scatta foto dalla webcam
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Imposta la dimensione del canvas uguale a quella del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Disegna il frame corrente del video sul canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converti l'immagine del canvas in blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Crea un File dal Blob
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            setSelfie(file);
            
            // Notifica l'utente
            toast({
              title: "Selfie acquisito",
              description: "Selfie scattato con successo"
            });
            
            // Ferma la webcam
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };
  
  // Cleanup della webcam quando si smonta il componente
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  // Controlla la disponibilità della fotocamera all'avvio
  useEffect(() => {
    // Controlla se il browser supporta mediaDevices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoInputs = devices.filter(device => device.kind === 'videoinput');
          setHasCamera(videoInputs.length > 0);
          
          // Se abbiamo una fotocamera, imposta la preferenza desktop come default
          if (videoInputs.length > 0 && currentStep === 1 && devicePreference === null) {
            setDevicePreference('desktop');
          }
        })
        .catch(err => {
          console.error("Errore nell'enumerazione dei dispositivi:", err);
          setHasCamera(false);
        });
    } else {
      setHasCamera(false);
    }
  }, [currentStep]);
  
  // Render content based on verification status
  const renderContent = () => {
    if (verificationStatus === 'success') {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Verifica completata</CardTitle>
            <CardDescription>
              Identità verificata con successo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-center">
              Il documento è stato firmato con successo. Puoi chiudere questa finestra.
            </p>
          </CardContent>
        </Card>
      );
    }
    
    if (verificationStatus === 'mobile_complete') {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Selfie inviato con successo</CardTitle>
            <CardDescription>
              Il selfie è stato trasferito al tuo computer
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center space-y-4">
              <p>
                Il tuo selfie è stato inviato con successo al dispositivo desktop.
              </p>
              <p className="font-medium">
                Torna al desktop per completare la verifica.
              </p>
              <div className="h-40 w-40 mx-auto relative rounded-md border p-2 mt-4">
                <img 
                  src={selfie ? URL.createObjectURL(selfie) : ''} 
                  alt="Selfie" 
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (verificationStatus === 'failed') {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Verifica fallita</CardTitle>
            <CardDescription>
              Non è stato possibile verificare l'identità
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 space-y-4">
            <div className="rounded-full bg-red-100 p-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <p className="text-center">
              La verifica dell'identità non è andata a buon fine. Puoi riprovare o contattare il tuo consulente per utilizzare un metodo di firma alternativo.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => setVerificationStatus('pending')}
            >
              Riprova
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verifica identità</CardTitle>
          <CardDescription>
            Completa la verifica per firmare il documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Steps currentStep={currentStep} className="mb-6">
            <Step title="Documento" />
            <Step title="Avvio" />
            <Step title="Identità" />
            <Step title="Selfie" />
            <Step title="Conferma" />
          </Steps>
          
          {/* Step 0: Documento e consensi */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="border rounded-md p-3 flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Documento da firmare:</p>
                  <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
                    <DialogTrigger asChild>
                      <p className="text-xs text-blue-500 cursor-pointer hover:underline flex items-center">
                        {sessionData?.documentName || "Questionario MIFID"}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </p>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>{sessionData?.documentName || "Questionario MIFID"}</DialogTitle>
                      </DialogHeader>
                      <div className="h-[80vh] w-full">
                        {sessionData?.documentUrl ? (
                          <iframe 
                            src={getProcessedDocumentUrl(sessionData.documentUrl)} 
                            className="w-full h-full" 
                            title="Documento da firmare"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <ScrollText className="h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-sm text-gray-500">Documento non disponibile</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Consent checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 border p-3 rounded-md">
                  <Checkbox 
                    id="consent1" 
                    checked={readAndApproved}
                    onCheckedChange={(checked) => setReadAndApproved(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent1" className="text-sm font-medium">
                      Dichiaro di aver letto, compreso e approvato integralmente il contenuto del presente documento, 
                      e di aver fornito informazioni veritiere, corrette e complete ai fini della sua sottoscrizione.
                    </Label>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 border p-3 rounded-md">
                  <Checkbox 
                    id="consent2" 
                    checked={understoodAndAccepted}
                    onCheckedChange={(checked) => setUnderstoodAndAccepted(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent2" className="text-sm font-medium">
                      Dichiaro di aver compreso e accettato che la firma elettronica avanzata sarà apposta mediante 
                      un processo che include l'acquisizione della mia immagine (selfie/video), la verifica del mio 
                      documento d'identità, e la registrazione dell'interazione ai fini di identificazione e tracciabilità, 
                      nel rispetto della normativa vigente (Regolamento eIDAS e CAD).
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 1: QR code o scansione mobile */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {!isDesktop ? (
                // Già su mobile, mostra conferma e procede automaticamente
                <div className="text-center space-y-6">
                  <div className="rounded-full bg-green-100 p-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Smartphone className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sei pronto per la verifica</h3>
                    <p className="text-sm text-gray-600">
                      Per procedere con il riconoscimento, clicca su "Continua"
                    </p>
                  </div>
                </div>
              ) : (
                // Su desktop, mostra QR code
                <div className="flex flex-col items-center py-6 space-y-6">
                  <p className="text-center font-medium">
                    Per procedere con la verifica, usa il tuo smartphone
                  </p>
                  <div className="p-4 bg-white border rounded-md">
                    <QRCodeSVG 
                      value={generateMobileUrl()} 
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">Scansiona per continuare sul tuo smartphone</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Scansiona il codice QR con la fotocamera del tuo smartphone per continuare il processo di verifica.
                    </p>
                  </div>
                  
                  <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <div className="flex space-x-2">
                      <ShieldCheck className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        Il processo di identificazione è sicuro e conforme alla normativa. 
                        Le tue informazioni personali sono protette e utilizzate solo ai fini della verifica dell'identità.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                    <div className="flex space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-700">
                        Attenzione: È necessario continuare dal tuo smartphone. Non è possibile procedere da questo dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Identità */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border rounded-md p-3 flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Documento da firmare:</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <p className="text-xs text-blue-500 cursor-pointer hover:underline flex items-center">
                        {sessionData?.documentName || "Questionario MIFID"}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </p>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>{sessionData?.documentName || "Questionario MIFID"}</DialogTitle>
                      </DialogHeader>
                      <div className="h-[80vh] w-full">
                        {sessionData?.documentUrl ? (
                          <iframe 
                            src={getProcessedDocumentUrl(sessionData.documentUrl)} 
                            className="w-full h-full" 
                            title="Documento da firmare"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <ScrollText className="h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-sm text-gray-500">Documento non disponibile</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <p className="font-medium text-sm mb-2">Fronte del documento</p>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment'; // Usa la fotocamera posteriore su mobile
                      input.onchange = (e) => {
                        if (e.target && (e.target as HTMLInputElement).files && (e.target as HTMLInputElement).files![0]) {
                          const file = (e.target as HTMLInputElement).files![0];
                          handleFileUpload(file, 'front');
                        }
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer w-full"
                  >
                    {idFront ? (
                      <>
                        <div className="h-32 w-full relative">
                          <img 
                            src={URL.createObjectURL(idFront)} 
                            alt="ID Front" 
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-green-600 font-medium mt-2">
                          ✓ Caricato: {idFront.name}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIdFront(null);
                          }}
                        >
                          Cambia immagine
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          Carica il fronte del tuo documento d'identità
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Tocca per scattare una foto o selezionare un'immagine
                        </p>
                      </>
                    )}
                  </button>
                </div>
                
                <div>
                  <p className="font-medium text-sm mb-2">Retro del documento</p>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment'; // Usa la fotocamera posteriore su mobile
                      input.onchange = (e) => {
                        if (e.target && (e.target as HTMLInputElement).files && (e.target as HTMLInputElement).files![0]) {
                          const file = (e.target as HTMLInputElement).files![0];
                          handleFileUpload(file, 'back');
                        }
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer w-full"
                  >
                    {idBack ? (
                      <>
                        <div className="h-32 w-full relative">
                          <img 
                            src={URL.createObjectURL(idBack)} 
                            alt="ID Back" 
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-green-600 font-medium mt-2">
                          ✓ Caricato: {idBack.name}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIdBack(null);
                          }}
                        >
                          Cambia immagine
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          Carica il retro del tuo documento d'identità
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Tocca per scattare una foto o selezionare un'immagine
                        </p>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Selfie */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm mb-4">
                Ora scatta un selfie per verificare la tua identità. Assicurati di essere in un ambiente ben illuminato e che il tuo volto sia ben visibile.
              </p>
              
              {selfie ? (
                // Selfie già scattato
                <div className="flex flex-col items-center py-6 space-y-6">
                  <p className="text-center font-medium text-green-600">
                    Selfie acquisito con successo!
                  </p>
                  <div className="p-4 bg-white border rounded-md shadow-sm border-green-200">
                    <div className="h-64 w-64 relative">
                      <img 
                        src={URL.createObjectURL(selfie)} 
                        alt="Selfie" 
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-600">Identità pronta per la verifica</p>
                    </div>
                    <p className="text-xs text-green-700">
                      Il selfie è stato acquisito con successo. Clicca "Continua" per procedere.
                    </p>
                  </div>
                </div>
              ) : (
                // Interfaccia per scattare un selfie
                <div className="flex flex-col items-center space-y-4">
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'user'; // Usa la fotocamera frontale
                      input.onchange = (e) => {
                        if (e.target && (e.target as HTMLInputElement).files && (e.target as HTMLInputElement).files![0]) {
                          const file = (e.target as HTMLInputElement).files![0];
                          handleFileUpload(file, 'selfie');
                        }
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer w-full"
                  >
                    <Camera className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-center mb-2 font-medium">
                      Scatta un selfie
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      Tocca per attivare la fotocamera e scattare un selfie
                    </p>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Step 4: Conferma */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border rounded-md p-3 flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Documento da firmare:</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <p className="text-xs text-blue-500 cursor-pointer hover:underline flex items-center">
                        {sessionData?.documentName || "Questionario MIFID"}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </p>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>{sessionData?.documentName || "Questionario MIFID"}</DialogTitle>
                      </DialogHeader>
                      <div className="h-[80vh] w-full">
                        {sessionData?.documentUrl ? (
                          <iframe 
                            src={getProcessedDocumentUrl(sessionData.documentUrl)} 
                            className="w-full h-full" 
                            title="Documento da firmare"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <ScrollText className="h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-sm text-gray-500">Documento non disponibile</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <p className="text-sm">
                Conferma i documenti caricati e procedi con la firma:
              </p>
              
              <div className="space-y-4">
                <p className="text-sm font-medium">Documenti per la verifica:</p>
                
                <div className="border rounded-md p-3 bg-white">
                  <p className="text-xs font-medium text-gray-500 mb-1">Documento d'identità (fronte)</p>
                  <div className="h-24 w-full relative bg-gray-50 overflow-hidden rounded-sm border">
                    <img 
                      src={idFront ? URL.createObjectURL(idFront) : ''} 
                      alt="ID Front" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                
                <div className="border rounded-md p-3 bg-white">
                  <p className="text-xs font-medium text-gray-500 mb-1">Documento d'identità (retro)</p>
                  <div className="h-24 w-full relative bg-gray-50 overflow-hidden rounded-sm border">
                    <img 
                      src={idBack ? URL.createObjectURL(idBack) : ''} 
                      alt="ID Back" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                
                <div className="border rounded-md p-3 bg-white">
                  <p className="text-xs font-medium text-gray-500 mb-1">Selfie per riconoscimento</p>
                  <div className="h-24 w-full relative bg-gray-50 overflow-hidden rounded-sm border">
                    <img 
                      src={selfie ? URL.createObjectURL(selfie) : ''} 
                      alt="Selfie" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border rounded p-3 bg-blue-50 text-sm">
                <p>
                  Cliccando su "Firma documento" acconsenti al trattamento delle tue immagini ai fini della verifica dell'identità per la firma del documento e confermi di aver preso visione del documento che stai per firmare.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isLoading}
            >
              Indietro
            </Button>
          ) : (
            <div></div>
          )}
          
          {currentStep < 4 ? (
            <Button
              onClick={() => {
                if (currentStep === 0 && !allConsentsAccepted) {
                  toast({
                    title: "Consensi richiesti",
                    description: "Per procedere è necessario accettare entrambi i consensi",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Blocca la navigazione in avanti se siamo nello step 1 e su desktop
                if (currentStep === 1 && isDesktop) {
                  toast({
                    title: "Scansiona il QR code",
                    description: "È necessario continuare dal tuo smartphone scansionando il QR code",
                    variant: "destructive"
                  });
                  return;
                }
                
                if (currentStep === 2 && (!idFront || !idBack)) {
                  toast({
                    title: "Documenti richiesti",
                    description: "Carica entrambi i lati del documento d'identità",
                    variant: "destructive"
                  });
                  return;
                }
                
                if (currentStep === 3 && !selfie) {
                  toast({
                    title: "Selfie richiesto",
                    description: "Scatta o carica un selfie per procedere",
                    variant: "destructive"
                  });
                  return;
                }
                
                setCurrentStep(currentStep + 1);
              }}
              disabled={isLoading || (currentStep === 0 && !allConsentsAccepted) || (currentStep === 1 && isDesktop)}
            >
              Continua
            </Button>
          ) : (
            <Button
              onClick={submitVerification}
              disabled={isLoading || !idFront || !idBack || !selfie}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                "Firma documento"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Firma Documento</h1>
        {renderContent()}
      </div>
    </div>
  );
} 