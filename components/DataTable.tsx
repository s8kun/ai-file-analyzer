import React, { useState, useEffect, useMemo } from "react";
import { TableRow } from "../types";
import { TrashIcon } from "./icons/TrashIcon";
import { EditIcon } from "./icons/EditIcon";
import { CheckIcon } from "./icons/CheckIcon";
import { XMarkIcon } from "./icons/XMarkIcon";
import { motion, AnimatePresence } from "framer-motion";
import { DownloadIcon } from "./icons/DownloadIcon";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DataTableProps {
  data: Array<Record<string, any>>;
  onUpdateData: (newData: Array<Record<string, any>>) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onUpdateData }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // استخدم useMemo لتوليد cleanData فقط عند تغير data
  const cleanData = useMemo(() => {
    return data
      .map((row) => {
        const cleanedRow: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            cleanedRow[key] = value;
          }
        });
        return cleanedRow;
      })
      .filter((row) => Object.keys(row).length > 0);
  }, [data]);

  // مزامنة selectedRows مع cleanData بشكل آمن
  useEffect(() => {
    setSelectedRows((prev) => {
      const newSet = new Set<number>();
      for (let idx = 0; idx < cleanData.length; idx++) {
        if (prev.has(idx)) newSet.add(idx);
      }
      // فقط إذا تغير شيء بالفعل
      if (newSet.size !== prev.size) return newSet;
      for (let idx of newSet) {
        if (!prev.has(idx)) return newSet;
      }
      return prev;
    });
  }, [cleanData.length]);

  useEffect(() => {
    if (cleanData.length > 0) {
      setHeaders(Object.keys(cleanData[0]));
    } else {
      setHeaders([]);
    }
  }, [cleanData]);

  // أضبط handleCellEditStart ليهيئ editValue ككائن فارغ عند بدء التعديل على خلية واحدة (للتوافق)
  const handleCellEditStart = (
    rowIndex: number,
    colKey: string,
    currentValue: string
  ) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue({ [colKey]: currentValue });
  };

  const handleCellEditSave = () => {
    if (editingCell) {
      const updatedData = cleanData.map((row, rIndex) => {
        if (rIndex === editingCell.row) {
          return { ...row, [editingCell.col]: editValue };
        }
        return row;
      });
      onUpdateData(updatedData);
      setEditingCell(null);
    }
  };

  // أضبط handleCellEditCancel ليعيد editValue إلى كائن فارغ
  const handleCellEditCancel = () => {
    setEditingCell(null);
    setEditValue({});
  };

  const handleRowDelete = (rowIndex: number) => {
    const updatedData = cleanData.filter((_, index) => index !== rowIndex);
    onUpdateData(updatedData);
  };

  // Select all handler
  const handleSelectAll = () => {
    if (selectedRows.size === cleanData.length && cleanData.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(cleanData.map((_, idx) => idx)));
    }
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    const updated = cleanData.filter((_, idx) => !selectedRows.has(idx));
    setSelectedRows(new Set());
    onUpdateData(updated);
  };

  // Add new row manually (always at least one column)
  const handleAddRow = () => {
    const columns = headers.length > 0 ? headers : ["Column 1"];
    const newRow: Record<string, any> = {};
    columns.forEach((col) => {
      newRow[col] = "";
    });

    const updatedData = [...cleanData, newRow];
    onUpdateData(updatedData);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "extracted_data.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text("AI File Analyzer", 14, 15);

    // Prepare data for the table
    const tableColumn = Object.keys(cleanData[0]);
    const tableRows = cleanData.map((item) => Object.values(item));

    // Add the table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 25 },
    });

    // Save the PDF
    doc.save("ai_file_analyzer_data.pdf");
  };

  if (!cleanData || cleanData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="mb-4">No data available</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddRow}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm md:text-base transition-colors duration-200"
        >
          + إضافة صف جديد
        </motion.button>
      </div>
    );
  }

  const columns = Object.keys(cleanData[0]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 px-2 pt-2">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm md:text-base transition-colors duration-200"
          >
            <DownloadIcon className="w-5 h-5" />
            Export to Excel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm md:text-base transition-colors duration-200"
          >
            <DownloadIcon className="w-5 h-5" />
            Export to PDF
          </motion.button>
        </div>
        {selectedRows.size > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteSelected}
            className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm md:text-base transition-colors duration-200"
          >
            حذف الصفوف المحددة
          </motion.button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs md:text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedRows.size === cleanData.length &&
                    cleanData.length > 0
                  }
                  onChange={handleSelectAll}
                  className="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  aria-label="Select all rows"
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-2 md:px-6 py-2 md:py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {cleanData.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <td className="px-2 md:px-4 py-2 md:py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => handleSelectRow(rowIndex)}
                    className="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    aria-label={`Select row ${rowIndex + 1}`}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column}`}
                    className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 text-xs md:text-sm"
                  >
                    {editingCell?.row === rowIndex ? (
                      <input
                        type="text"
                        value={editValue[column] ?? row[column]}
                        onChange={(e) => {
                          setEditValue((prev: any) => ({
                            ...prev,
                            [column]: e.target.value,
                          }));
                        }}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-xs md:text-sm"
                        autoFocus={column === columns[0]}
                      />
                    ) : (
                      row[column]
                    )}
                  </td>
                ))}
                <td className="px-2 md:px-4 py-2 md:py-4 text-center">
                  {editingCell?.row === rowIndex ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const updatedData = cleanData.map((row, rIndex) => {
                            if (rIndex === rowIndex) {
                              return { ...row, ...editValue };
                            }
                            return row;
                          });
                          onUpdateData(updatedData);
                          setEditingCell(null);
                          setEditValue({});
                        }}
                        className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors mr-2"
                        aria-label={`Save row ${rowIndex + 1}`}
                      >
                        <CheckIcon className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setEditingCell(null);
                          setEditValue({});
                        }}
                        className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        aria-label={`Cancel edit row ${rowIndex + 1}`}
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setEditingCell({ row: rowIndex, col: "" });
                          setEditValue({ ...row });
                        }}
                        className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mr-2"
                        aria-label={`Edit row ${rowIndex + 1}`}
                      >
                        <EditIcon className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRowDelete(rowIndex)}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        aria-label={`Delete row ${rowIndex + 1}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </motion.button>
                    </>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
