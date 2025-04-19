import React from 'react';
import { format } from 'date-fns';
import { Fingerprint, Download, AlertCircle, PenLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VerifiedDocumentProps {
  clientId: number;
}

export function VerifiedDocumentsTable({ clientId }: VerifiedDocumentProps) {
  const { t } = useTranslation();
  
  // Query per recuperare i documenti verificati
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/verified-documents', clientId],
    queryFn: () => apiRequest(`/api/verified-documents/${clientId}`),
    enabled: !!clientId,
  });
  
  if (isLoading) {
    return (
      <div className="py-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-6 text-center text-destructive">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p>Si è verificato un errore nel caricamento dei documenti.</p>
      </div>
    );
  }
  
  const documents = data?.documents || [];
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('client.document_name') || "Nome Documento"}</TableHead>
            <TableHead>{t('client.document_type') || "Tipo"}</TableHead>
            <TableHead>{t('client.signature_date') || "Data Verifica"}</TableHead>
            <TableHead>{t('client.signature_type') || "Tipo Verifica"}</TableHead>
            <TableHead className="text-right">{t('client.actions') || "Documento"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length > 0 ? (
            documents.map((doc: any) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  MIFID {doc.sessionId.split('-').pop()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">MIFID</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(doc.verificationDate), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  {doc.tokenUsed === "manual-upload" ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <PenLine className="h-3 w-3 mr-1" />
                      Manuale
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Fingerprint className="h-3 w-3 mr-1" />
                      Digitale
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {doc.documentUrl ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(doc.documentUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">PDF non disponibile</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                {t('client.no_signed_documents') || "Nessun documento verificato"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 