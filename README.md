# AI File Analyzer

AI File Analyzer is a sophisticated web application that allows you to upload files (PDF, Excel, images), extract structured data from them, and interact with the content through an AI-powered chat interface. This project is built with modern technologies to provide a seamless and efficient user experience.

## ✨ Key Features

- **Multi-File Type Analysis**: Supports PDF, Excel spreadsheets (.xlsx), and image files.
- **Intelligent Data Extraction**: Uses the Google Gemini model to automatically extract structured data and display it in an interactive table.
- **Editable Data Table**: You can directly edit the extracted data in the user interface.
- **Interactive Chatbot**: Ask questions about your file's content and get accurate answers from the AI.
- **Source Display**: Shows the sources from Google Search that the AI used (if any).
- **Modern UI**: Features an attractive design with support for Dark Mode.
- **Auto-Save**: Extracted data is saved in the browser's local storage for easy subsequent access.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Artificial Intelligence (AI)**: [Google Gemini API](https://ai.google.dev/)
- **File Parsing**:
  - `pdfjs-dist` for parsing PDF files.
  - `xlsx` for parsing Excel files.

## 🚀 Running Locally

Follow these steps to run the project on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- An API key from [Google Gemini](https://ai.google.dev/)

### Installation Steps

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/s8kun/ai-file-analyzer.git
    cd ai-file-analyzer
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    - Create a new file named `.env.local` in the project's root directory.
    - Add your Gemini API key to the file as follows:
      ```
      VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE
      ```
      > **Important Note:** Since the project uses Vite, the variable name must start with `VITE_` for the application to access it.

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

5.  **Open the application in your browser:**
    Open the link that appears in the terminal (usually `http://localhost:5173`).

## 📖 How to Use

1.  **Upload a File**: Drag and drop a file (PDF, XLSX, or image) into the upload area, or click to select it from your device.
2.  **Wait for Analysis**: The AI will analyze the file and extract the data.
3.  **View Data**: The extracted data will appear in a table that you can edit.
4.  **Chat with the File**: Click the chat icon in the bottom right corner of the screen to start asking questions about the file's content.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improving the project, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.
