import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Fingerprint, PenLine, Download, FileCheck, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { VerifiedDocumentsTable } from '@/components/VerifiedDocumentsTable';
import { TabsContent } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MifidTabProps {
  clientId: number;
  onShowPdfDialog: () => void;
  onDigitalSignature: () => void;
  onTraditionalSignature: () => void;
}

export function MifidTab({ 
  clientId, 
  onShowPdfDialog, 
  onDigitalSignature, 
  onTraditionalSignature 
}: MifidTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Controlla se esiste già un PDF per questo cliente
  useEffect(() => {
    const checkPdfExists = async () => {
      try {
        const response = await apiRequest(`/api/clients/${clientId}/documents?type=pdf`, {
          method: 'GET'
        });
        
        if (response.success && response.documents && response.documents.length > 0) {
          // Trova il PDF MiFID più recente
          const mifidPdf = response.documents.find((doc: any) => doc.fileName.includes('MIFID'));
          if (mifidPdf) {
            setPdfGenerated(true);
            setPdfUrl(mifidPdf.fileUrl);
          }
        }
      } catch (error) {
        console.error("Errore nel controllo della presenza di PDF:", error);
      }
    };
    
    if (clientId) {
      checkPdfExists();
    }
  }, [clientId]);
  
  // Funzione per generare e salvare automaticamente il PDF
  const generateAndSavePdf = async () => {
    setIsGenerating(true);
    try {
      // Mostra semplicemente il dialogo per generare il PDF
      // Il salvataggio viene gestito direttamente dal dialogo
      onShowPdfDialog();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del PDF",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Funzione per aprire il file picker
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Funzione per gestire il caricamento del file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verifica che sia un PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Formato non valido",
        description: "Per favore carica un file PDF",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica dimensione (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File troppo grande",
        description: "Il file non deve superare i 10MB",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadSuccess(false);
    
    try {
      // Creiamo un FormData per l'invio del file
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('clientId', clientId.toString());
      formData.append('documentType', 'MIFID_SIGNED');
      
      // Inviamo il file al server
      const response = await fetch('/api/clients/save-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Errore nel caricamento: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        try {
          // Genera un ID sessione univoco
          const sessionId = `manual-upload-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Registra il documento nei documenti verificati
          const verifiedResponse = await apiRequest('/api/verified-documents/manual', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientId,
              sessionId,
              documentUrl: data.fileUrl
            }),
          });
          
          if (verifiedResponse.success) {
            toast({
              title: "Documento caricato con successo",
              description: "Il documento firmato è stato caricato e aggiunto ai documenti verificati",
            });
            
            setUploadSuccess(true);
            
            // Reset del file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } else {
            throw new Error(verifiedResponse.message || "Errore durante la registrazione del documento");
          }
        } catch (docError) {
          console.error("Errore nell'aggiunta del documento verificato:", docError);
          toast({
            title: "Attenzione",
            description: "Il documento è stato caricato, ma si è verificato un problema nell'aggiungerlo ai documenti verificati",
            variant: "destructive"
          });
        }
      } else {
        throw new Error("Il server ha risposto con successo, ma il caricamento non è riuscito");
      }
    } catch (error) {
      console.error("Errore nel caricamento del file:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento del documento",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <TabsContent value="mifid-docs" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('client.mifid_documentation') || "Documentazione MIFID"}</CardTitle>
          <CardDescription>
            {t('client.mifid_docs_description') || "Genera e gestisci la documentazione MIFID per il cliente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Generate Documents Section */}
            <div className="border rounded-md p-6">
              <h3 className="text-lg font-medium mb-2">{t('client.generate_documents') || "Genera Documenti MIFID"}</h3>
              <p className="text-sm text-gray-500 mb-4">
                Genera documento MIFID obbligatorio del cliente a partire dalle informazioni caricate nel modulo di onboarding. Invialo per firma digitale o tradizionale
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {pdfGenerated ? (
                  <div className="flex items-center space-x-3">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">PDF MIFID generato</span>
                    {pdfUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(pdfUrl, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <Download className="h-4 w-4" />
                        <span>Scarica</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow"></div> // Spacer per spingere il bottone a destra
                )}
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {!pdfGenerated && (
                    <Button 
                      variant="default" 
                      onClick={generateAndSavePdf}
                      className="flex items-center space-x-2"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          <span>Generazione in corso...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>{t('client.generate_pdf') || "Genera PDF MIFID"}</span>
                        </>
                      )}
                    </Button>
                  )}
                
                  {/* Mostra i pulsanti per la firma solo se il PDF è stato generato */}
                  {pdfGenerated && (
                    <>
                      <Button 
                        onClick={onDigitalSignature}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Fingerprint className="h-4 w-4" />
                        <span>Firma digitale</span>
                      </Button>
                      
                      <Button 
                        onClick={onTraditionalSignature}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <PenLine className="h-4 w-4" />
                        <span>Firma tradizionale</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Upload Section */}
            <div className="border rounded-md p-6">
              <h3 className="text-lg font-medium mb-2">Caricamento Documenti Firmati</h3>
              <p className="text-sm text-gray-500 mb-4">
                Carica un documento PDF MIFID già firmato dal cliente. Il documento verrà salvato in modo sicuro
                nel sistema e registrato come documento firmato.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-grow"></div> {/* Spacer per spingere il bottone a destra */}
                
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  
                  {uploadSuccess ? (
                    <div className="flex items-center text-green-600 space-x-2">
                      <Check className="h-5 w-5" />
                      <span>Documento caricato con successo</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="flex items-center space-x-2"
                      variant="default"
                    >
                      {isUploading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          <span>Caricamento in corso...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Carica documento firmato</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Verified Documents Section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">{t('client.verified_documents') || "Documenti Verificati"}</h3>
              <VerifiedDocumentsTable clientId={clientId} />
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
} 