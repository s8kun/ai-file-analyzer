export type TableRow = Record<string, string>;

export interface TableColumn {
  key: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export enum FileType {
  PDF = "pdf",
  EXCEL = "excel",
  IMAGE = "image",
  UNKNOWN = "unknown",
}

export interface GroundingChunkWeb {
  uri?: string; // Made uri optional to match @google/genai
  title?: string;
}

export interface RetrievedContext {
  // Added for clarity, matches library structure for retrievedContext
  uri?: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: RetrievedContext;
  // Add other potential grounding chunk types if necessary from the library if used
}

// Minimal change to satisfy error, ideally GroundingAttribution would be typed if used.
// export declare interface GroundingAttribution {
//     sourceId?: string;
//     content?: Content;
// }
// For now, any[] is kept from original.
export interface GroundingMetadata {
  groundingAttributions?: any[];
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
}
