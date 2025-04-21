export interface EmailFormData {
  subject: string;
  message: string;
  recipientName: string;
  recipientEmail: string;
  clientId?: number;
  includeAttachment?: boolean;
  attachmentUrl?: string;
} 