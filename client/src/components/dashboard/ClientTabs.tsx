export interface ClientTabsProps {
  client: Client;
  clientId: string;
  isLoading?: boolean;
  onShowPdfDialog?: () => void;
  onDigitalSignature?: (pdfUrl?: string) => void;
  onTraditionalSignature?: () => void;
}

const handleDigitalSignatureDialogOpen = () => {
  console.log('[DEBUG ClientTabs] Richiesta firma digitale con PDFDocUrl:', PDFDocUrl);
  if (onDigitalSignature) {
    onDigitalSignature(PDFDocUrl);
  }
}; 