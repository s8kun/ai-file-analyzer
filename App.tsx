import React, { useState, useEffect, useCallback } from "react";
import { FileUpload } from "./components/FileUpload";
import { DataTable } from "./components/DataTable";
import { Chatbot } from "./components/Chatbot";
import { Header } from "./components/Header";
import { Spinner } from "./components/Spinner";
import { FileType, TableRow, ChatMessage, GroundingMetadata } from "./types";
import { parseFile } from "./services/fileParserService";
import { extractDataFromContent, chatWithAI } from "./services/geminiService";
import { ThemeToggle } from "./components/ThemeToggle";
import { ErrorAlert } from "./components/ErrorAlert";
import { motion, AnimatePresence } from "framer-motion";
import { MessageIcon } from "./components/icons/MessageIcon";
import { SparklesIcon } from "./components/icons/SparklesIcon";

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(FileType.UNKNOWN);
  const [parsedFileContent, setParsedFileContent] = useState<string | null>(
    null
  ); // Text or base64

  const [extractedData, setExtractedData] = useState<TableRow[]>(() => {
    const saved = localStorage.getItem("extractedData");
    return saved ? JSON.parse(saved) : [];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

  const [groundingMetadata, setGroundingMetadata] =
    useState<GroundingMetadata | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      setCurrentTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setCurrentTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (currentTheme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setCurrentTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setCurrentTheme("light");
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setUploadedFile(null);
      setParsedFileContent(null);
      setExtractedData([]);
      setChatMessages([]);
      setError(null);
      setGroundingMetadata(null);
      return;
    }

    setUploadedFile(file);
    setIsLoadingFile(true);
    setError(null);
    setExtractedData([]);
    setChatMessages([]);
    setGroundingMetadata(null);

    try {
      const { content, type } = await parseFile(file);
      setParsedFileContent(content);
      setFileType(type);
      setIsLoadingFile(false);

      // Automatically trigger data extraction
      setIsLoadingData(true);
      const {
        data: newExtractedData,
        groundingMetadata: newGroundingMetadata,
      } = await extractDataFromContent(content, type, file.name);
      setExtractedData(newExtractedData);
      setGroundingMetadata(newGroundingMetadata);
      if (newExtractedData.length === 0 && !newGroundingMetadata) {
        setError(
          "AI could not extract structured data. The file might not contain a clear table, or the content is ambiguous. You can still try chatting with the AI about the raw content if available."
        );
      }
    } catch (err) {
      console.error("Error processing file or extracting data:", err);
      setError(err instanceof Error ? err.message : String(err));
      setExtractedData([]);
    } finally {
      setIsLoadingFile(false);
      setIsLoadingData(false);
    }
  };

  const handleDataUpdate = (updatedData: TableRow[]) => {
    setExtractedData(updatedData);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: messageText,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setIsLoadingChat(true);
    setError(null);

    try {
      const aiResponseText = await chatWithAI(
        extractedData,
        chatMessages,
        messageText,
        parsedFileContent,
        fileType
      );
      const newAiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newAiMessage]);
    } catch (err) {
      console.error("Error in chat:", err);
      const errorText = err instanceof Error ? err.message : String(err);
      setError(`Chat AI error: ${errorText}`);
      const errorAiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `Sorry, I encountered an error: ${errorText}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const showChatbot =
    extractedData.length > 0 ||
    (parsedFileContent && fileType !== FileType.UNKNOWN);

  // Sync extractedData to localStorage
  useEffect(() => {
    localStorage.setItem("extractedData", JSON.stringify(extractedData));
  }, [extractedData]);

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-50">
      <Header title="AI File Analyzer">
        <ThemeToggle theme={currentTheme} toggleTheme={toggleTheme} />
      </Header>
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <AnimatePresence>
          {!uploadedFile && !isLoadingFile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center py-20 px-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-20 h-20 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center"
              >
                <SparklesIcon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4"
              >
                Welcome to AI File Analyzer
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto"
              >
                Upload your PDF, Excel, or Image files and let our AI analyze
                them for you.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
              >
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    PDF Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Extract and analyze data from PDF documents with AI-powered
                    insights.
                  </p>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Excel Processing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Analyze spreadsheet data and get intelligent insights from
                    your Excel files.
                  </p>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg
                      className="w-6 h-6 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Image Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Extract text and data from images with advanced AI
                    recognition.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ErrorAlert message={error} onClose={() => setError(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          id="file-upload"
          className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-2xl"
        >
          <h2 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400 flex items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="inline-block w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400"
            >
              1
            </motion.span>
            Upload Your File
          </h2>
          <FileUpload
            onFileChange={handleFileChange}
            isLoading={isLoadingFile}
          />
          {isLoadingFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-center text-lg text-gray-600 dark:text-gray-300"
            >
              <Spinner /> Processing file...
            </motion.div>
          )}
        </motion.section>

        <AnimatePresence mode="wait">
          {isLoadingData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6 flex items-center justify-center text-lg text-gray-600 dark:text-gray-300"
            >
              <Spinner /> AI is analyzing data...
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {extractedData.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
              id="data-table"
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="inline-block w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400"
                >
                  2
                </motion.span>
                Extracted Data Table
              </h2>
              <DataTable data={extractedData} onUpdateData={handleDataUpdate} />
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {groundingMetadata &&
            groundingMetadata.groundingChunks &&
            groundingMetadata.groundingChunks.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                id="grounding-info"
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
              >
                <h3 className="text-xl font-bold mb-4 text-primary-600 dark:text-primary-400">
                  Sources (from Google Search)
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  {groundingMetadata.groundingChunks.map((chunk, index) => {
                    const source = chunk.web || chunk.retrievedContext;
                    if (source && source.uri) {
                      return (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors duration-200"
                          >
                            {source.title || source.uri}
                          </a>
                        </motion.li>
                      );
                    }
                    return null;
                  })}
                </ul>
                {groundingMetadata.webSearchQueries &&
                  groundingMetadata.webSearchQueries.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Search queries used:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {groundingMetadata.webSearchQueries.map((query, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            {query}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
              </motion.section>
            )}
        </AnimatePresence>

        {showChatbot && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-4 right-4 bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Open chat"
            >
              <MessageIcon className="w-6 h-6" />
            </motion.button>
            <Chatbot
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={isLoadingChat}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </>
        )}
      </main>
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center p-6 text-sm text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        &copy; {new Date().getFullYear()} AI File Analyzer. Powered by
        Elferjnai.
      </motion.footer>
    </div>
  );
};

export default App;
