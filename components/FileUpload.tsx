import React, { useCallback, useState, useEffect } from "react";
import { ACCEPTED_FILE_TYPES } from "../constants";
import { UploadIcon } from "./icons/UploadIcon";

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileChange,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const acceptedTypesString = Object.keys(ACCEPTED_FILE_TYPES).join(",");

  useEffect(() => {
    const input = document.getElementById(
      "file-upload-input"
    ) as HTMLInputElement | null;
    if (
      !isLoading &&
      fileName &&
      (!input || !input.files || !input.files.length)
    ) {
      setFileName(null);
    }
  }, [isLoading]);

  const handleFile = useCallback(
    (file: File | null) => {
      if (file) {
        if (
          ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES]
        ) {
          onFileChange(file);
          setFileName(file.name);
          setTimeout(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }, 0);
        } else {
          alert(
            `File type not supported. Please upload one of: ${Object.values(
              ACCEPTED_FILE_TYPES
            ).join(", ")}`
          );
          onFileChange(null);
          setFileName(null);
        }
      } else {
        onFileChange(null);
        setFileName(null);
      }
    },
    [onFileChange]
  );

  const handleDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      // Changed HTMLDivElement to HTMLLabelElement
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    } else {
      handleFile(null);
    }
  };

  const handleRemoveFile = () => {
    handleFile(null);
    // Reset the input field value if needed
    const inputElement = document.getElementById(
      "file-upload-input"
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <label
        htmlFor="file-upload-input"
        tabIndex={-1}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`w-full max-w-lg flex flex-col items-center px-6 py-12 bg-white dark:bg-gray-700 rounded-xl shadow-lg tracking-wide border-2 ${
          dragActive
            ? "border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20"
            : "border-dashed border-gray-300 dark:border-gray-600"
        } cursor-pointer hover:border-primary-400 dark:hover:border-primary-300 transition-all duration-200 hover:shadow-xl`}
      >
        <div
          className={`p-4 rounded-full ${
            dragActive
              ? "bg-primary-100 dark:bg-primary-900/30"
              : "bg-gray-100 dark:bg-gray-600"
          } transition-colors duration-200`}
        >
          <UploadIcon className="w-12 h-12 text-primary-500 dark:text-primary-400" />
        </div>
        <span className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">
          {dragActive
            ? "Drop the file here..."
            : "Drag & drop a file, or click to select"}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Supported: PDF, Excel (XLS, XLSX), Images (PNG, JPG)
        </span>
        <input
          id="file-upload-input"
          type="file"
          className="hidden"
          accept={acceptedTypesString}
          onChange={handleChange}
          disabled={isLoading}
        />
      </label>
      {fileName && !isLoading && (
        <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 w-full max-w-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </p>
          </div>
          <button
            onClick={handleRemoveFile}
            className="flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Remove file"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
