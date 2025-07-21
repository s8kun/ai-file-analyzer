import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { TableRow, ChatMessage, FileType, GroundingMetadata } from "../types";
import { GEMINI_TEXT_MODEL } from "../constants";

const API_KEY = "AIzaSyBx6S4JOcPykSv8Z_gVv_0yAcSZ3jxDHOI";

if (!API_KEY) {
  throw new Error(
    "GEMINI_API_KEY environment variable is not set. Please set it in your .env file."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const parseJsonFromGeminiResponse = (responseText: string): TableRow[] => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }

  // محاولة إزالة أي نص زائد بعد آخر قوس ] أو }
  const lastArray = jsonStr.lastIndexOf("]");
  const lastObject = jsonStr.lastIndexOf("}");
  let lastBracket = -1;
  if (lastArray > -1 && lastObject > -1) {
    lastBracket = Math.max(lastArray, lastObject);
  } else {
    lastBracket = Math.max(lastArray, lastObject);
  }
  if (lastBracket !== -1) {
    jsonStr = jsonStr.slice(0, lastBracket + 1);
  }

  try {
    const parsedData = JSON.parse(jsonStr);
    if (
      Array.isArray(parsedData) &&
      parsedData.every((item) => typeof item === "object" && item !== null)
    ) {
      // Convert all cell values to strings for consistency in the table
      return parsedData.map((row) => {
        const stringifiedRow: TableRow = {};
        for (const key in row) {
          stringifiedRow[key] = String(row[key]);
        }
        return stringifiedRow;
      });
    }
    console.warn("Parsed data from AI is not an array of objects:", parsedData);
    return [];
  } catch (e) {
    console.error(
      "Failed to parse JSON response from Gemini:",
      e,
      "Raw response:",
      responseText
    );
    throw new Error(
      "AI response was not valid JSON. The AI might have failed to structure the data correctly."
    );
  }
};

export const extractDataFromContent = async (
  content: string,
  fileType: FileType,
  fileName: string
): Promise<{
  data: TableRow[];
  groundingMetadata: GroundingMetadata | null;
}> => {
  let parts: Part[] = [];
  let promptText = "";

  if (fileType === FileType.IMAGE) {
    promptText = `Analyze the provided image named "${fileName}". It may contain a table or structured data. Perform OCR if necessary to extract text from the image. Then, identify any tabular data from the extracted text or directly from the image structure. Extract this data into a JSON array of objects, where each object represents a row and keys are column headers. If no clear headers, infer them. Focus on extracting names, numbers, and dates. If no table is found, return an empty array.`;
    parts = [
      { text: promptText },
      {
        inlineData: {
          mimeType: fileName.endsWith(".png") ? "image/png" : "image/jpeg", // Infer mimeType basic
          data: content, // content is base64 for images
        },
      },
    ];
  } else {
    // PDF, Excel, Unknown (treated as text)
    promptText = `Analyze the following text content extracted from a ${
      fileType === FileType.UNKNOWN ? "file" : fileType
    } named "${fileName}". Identify any tabular data within this text. Extract the data into a JSON array of objects, where each object represents a row and its keys are the column headers. If column headers are not explicitly available, infer them from the data. Focus on extracting meaningful entities like names, numbers, dates, emails, etc. If no clear table structure is found, return an empty array. Text Content:\n\n${content}`;
    parts = [{ text: promptText }];
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json", // Request JSON output
        // Add tools for Google Search if the query might benefit from it
        // This is a generic extraction, so Search might be too broad unless specified
        // For example, if we knew the content was about recent events:
        // tools: [{googleSearch: {}}],
      },
    });

    const extractedText = response.text;
    const groundingMetadata =
      response.candidates?.[0]?.groundingMetadata || null;

    if (!extractedText) {
      if (groundingMetadata && groundingMetadata.groundingChunks?.length) {
        return { data: [], groundingMetadata: null }; // Return empty data and null grounding metadata
      }
      throw new Error("AI returned no text. Unable to extract data.");
    }
    const data = parseJsonFromGeminiResponse(extractedText);
    // Convert Gemini's GroundingMetadata to our custom type
    const convertedGroundingMetadata: GroundingMetadata | null =
      groundingMetadata
        ? {
            ...groundingMetadata,
            groundingChunks: groundingMetadata.groundingChunks?.map(
              (chunk) => ({
                ...chunk,
                retrievedContext: chunk.retrievedContext
                  ? {
                      ...chunk.retrievedContext,
                      title: chunk.retrievedContext.title || "", // Ensure title is never undefined
                    }
                  : undefined,
              })
            ),
          }
        : null;
    return { data, groundingMetadata: convertedGroundingMetadata };
  } catch (error) {
    console.error("Error calling Gemini API for data extraction:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("API key not valid")) {
      throw new Error(
        "Invalid Gemini API Key. Please check your API_KEY environment variable."
      );
    }
    throw new Error(`AI data extraction failed: ${errorMessage}`);
  }
};

export const chatWithAI = async (
  tableData: TableRow[],
  chatHistory: ChatMessage[],
  userMessage: string,
  rawFileContent: string | null, // For context if no table
  fileType: FileType // For context if no table
): Promise<string> => {
  let context = "";
  if (tableData.length > 0) {
    context = `Based *only* on the following JSON data representing a table, answer the user's question. Do not use any external knowledge. If the answer cannot be found in the data, state that clearly.\nTable Data:\n${JSON.stringify(
      tableData,
      null,
      2
    )}\n\n`;
  } else if (rawFileContent) {
    if (fileType === FileType.IMAGE) {
      context = `The user uploaded an image. The AI was unable to extract a structured table from it. The user's question might be about the general content of the image. Answer to the best of your ability based on the user's question, acknowledging you don't have structured data. The original image content (base64) is not provided here again for brevity, assume you have 'seen' it. \n\n`;
    } else {
      context = `The user uploaded a ${fileType} file. The AI was unable to extract a structured table from it. The user's question might be about the general content of the file. Answer based on the following text extracted from the file. Do not use any external knowledge. If the answer cannot be found in the text, state that clearly.\nFile Content:\n\`\`\`\n${rawFileContent.substring(
        0,
        2000
      )}...\n\`\`\`\n(Content might be truncated for brevity)\n\n`; // Limit context size
    }
  } else {
    context =
      "There is no file data available. Answer generally or state that you lack context.\n\n";
  }

  // Simple history construction - just last few messages
  const historyPrompt = chatHistory
    .slice(-4)
    .map((msg) => `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}`)
    .join("\n");

  const fullPrompt = `${context}Chat History (for context):\n${historyPrompt}\n\nUser: ${userMessage}\nAI:`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: fullPrompt,
      config: {
        // Consider if search is useful for chat Q&A. For "only from table", it's not.
        // tools: [{googleSearch: {}}],
        // If search is used, you MUST display response.candidates[0].groundingMetadata.groundingChunks
        temperature: 0.5, // More factual for Q&A
      },
    });

    const aiResponseText = response.text;
    if (!aiResponseText) {
      throw new Error("AI returned an empty response.");
    }
    return aiResponseText;
  } catch (error) {
    console.error("Error calling Gemini API for chat:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("API key not valid")) {
      throw new Error(
        "Invalid Gemini API Key. Please check your API_KEY environment variable."
      );
    }
    throw new Error(`AI chat failed: ${errorMessage}`);
  }
};
