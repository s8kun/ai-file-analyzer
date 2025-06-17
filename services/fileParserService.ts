
import { FileType } from '../types';
import { ACCEPTED_FILE_TYPES } from '../constants';

// Ensure pdfjsLib and XLSX are globally available from CDN
declare const pdfjsLib: any;
declare const XLSX: any;

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Remove "data:mime/type;base64," prefix
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText;
};

const parseExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
  let fullText = '';
  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length > 0) {
      fullText += `Sheet: ${sheetName}\n`;
      jsonData.forEach((rowArray: any[]) => {
        fullText += rowArray.map(cell => cell !== null && cell !== undefined ? String(cell) : '').join('\t') + '\n';
      });
      fullText += '\n';
    }
  });
  return fullText.trim();
};

export const parseFile = async (
  file: File
): Promise<{ content: string; type: FileType }> => {
  const fileMimeType = file.type;
  const determinedType = ACCEPTED_FILE_TYPES[fileMimeType as keyof typeof ACCEPTED_FILE_TYPES] as FileType || FileType.UNKNOWN;

  if (determinedType === FileType.PDF) {
    const textContent = await parsePdf(file);
    return { content: textContent, type: FileType.PDF };
  } else if (determinedType === FileType.EXCEL) {
    const textContent = await parseExcel(file);
    return { content: textContent, type: FileType.EXCEL };
  } else if (determinedType === FileType.IMAGE) {
    const base64Content = await readFileAsBase64(file);
    return { content: base64Content, type: FileType.IMAGE };
  } else {
    // Try reading as plain text for unknown but potentially text-based files
    try {
        const textContent = await readFileAsText(file);
        return { content: textContent, type: FileType.UNKNOWN }; // Still mark as unknown for specific AI handling
    } catch (e) {
        throw new Error('Unsupported file type or unable to read file.');
    }
  }
};