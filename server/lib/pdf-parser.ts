import fs from 'fs';
import { Buffer } from 'buffer.js';

// Define the PDFData interface locally
interface PDFData {
  text: string;
  numpages: number;
  numrender: number;
  info: {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    IsCollectionPresent?: boolean;
    Author?: string;
    Creator?: string;
    Producer?: string;
    ModDate?: string;
    CreationDate?: string;
    [key: string]: any;
  };
  metadata: any;
  version: string;
}

// Safe wrapper for pdf-parse that avoids the test file error
async function parsePDF(pdfBuffer: Buffer): Promise<{
  text: string;
  numpages: number;
  info: any;
  metadata: any;
}> {
  // Dynamically import pdf-parse only when needed
  // and handle any initialization errors
  try {
    // We need to import with require since it's a CommonJS module
    const pdfParseModule = await import('pdf-parse.js');
    const pdfParse = pdfParseModule.default;
    
    // Parse the PDF buffer
    const data = await pdfParse(pdfBuffer);
    
    return {
      text: data.text || '',
      numpages: data.numpages || 0,
      info: data.info || {},
      metadata: data.metadata || {}
    };
  } catch (error) {
    // If there's an error loading the module, try the alternative method
    console.error('Error importing pdf-parse, using alternative method:', error);
    return await parseWithAlternativeMethod(pdfBuffer);
  }
}

// Alternative basic PDF parsing method as fallback
async function parseWithAlternativeMethod(pdfBuffer: Buffer): Promise<{
  text: string;
  numpages: number;
  info: any;
  metadata: any;
}> {
  try {
    // If pdf-parse fails, we'll try to get at least basic metadata
    // using pdf-lib which we already have
    
    const { PDFDocument } = await import('pdf-lib.js');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Get basic metadata
    const title = pdfDoc.getTitle() || '';
    const author = pdfDoc.getAuthor() || '';
    const subject = pdfDoc.getSubject() || '';
    const keywords = pdfDoc.getKeywords() || '';
    const pageCount = pdfDoc.getPageCount();
    
    return {
      text: `Title: ${title}\nAuthor: ${author}\nSubject: ${subject}\nKeywords: ${keywords}`,
      numpages: pageCount,
      info: {
        Title: title,
        Author: author,
        Subject: subject,
        Keywords: keywords
      },
      metadata: {}
    };
  } catch (secondError) {
    console.error('Alternative PDF parsing method also failed:', secondError);
    // Return empty data if both methods fail
    return {
      text: '',
      numpages: 0,
      info: {},
      metadata: {}
    };
  }
}

export default parsePDF; 