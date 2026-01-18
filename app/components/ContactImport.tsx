"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { UploadCloud, Check, Info, FileText, Hash, User } from "lucide-react";
import { useTranslations } from "next-intl";

interface Contact {
  name: string;
  phone: string;
}

interface ContactImportProps {
  onContactsLoaded: (contacts: Contact[]) => void;
  // State lifted to parent to persist across tab switches
  data: any[][];
  setData: (data: any[][]) => void;
  nameCol: number | null;
  setNameCol: (col: number | null) => void;
  phoneCol: number | null;
  setPhoneCol: (col: number | null) => void;
  startRow: number;
  setStartRow: (row: number) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
}

export default function ContactImport({ 
  onContactsLoaded,
  data, setData,
  nameCol, setNameCol,
  phoneCol, setPhoneCol,
  startRow, setStartRow,
  fileName, setFileName
}: ContactImportProps) {
  const t = useTranslations("Wizard.step1");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      if (!bstr) return;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      let parsedData: any[][] = [];

      if (extension === 'csv') {
        Papa.parse(file, {
          complete: (results) => {
            parsedData = results.data as any[][];
            processData(parsedData);
          },
          header: false,
          skipEmptyLines: true,
        });
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        const data = new Uint8Array(bstr as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        processData(parsedData);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const processData = (parsedData: any[][]) => {
    setData(parsedData);
    if (parsedData.length > 0) {
      deduceColumns(parsedData);
    }
  };

  const deduceColumns = (rows: any[][]) => {
    // 1. Try to find headers in first 5 rows
    const nameKeywords = ["name", "full name", "guest", "اسم", "الاسم", "المدعو", "الضيف"];
    const phoneKeywords = ["phone", "number", "mobile", "whatsapp", "رقم", "جوال", "هاتف", "واتساب", "تلفون"];
    
    let detectedNameCol: number | null = null;
    let detectedPhoneCol: number | null = null;
    let detectedStartRow = 0;

    // Check first few rows for header keywords
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toLowerCase().trim();
        if (detectedNameCol === null && nameKeywords.some(k => cell.includes(k))) {
          detectedNameCol = j;
          detectedStartRow = i + 1;
        }
        if (detectedPhoneCol === null && phoneKeywords.some(k => cell.includes(k))) {
          detectedPhoneCol = j;
          detectedStartRow = i + 1;
        }
      }
      if (detectedNameCol !== null && detectedPhoneCol !== null) break;
    }

    // 2. If keywords fail, check content patterns in first 10 rows
    if (detectedNameCol === null || detectedPhoneCol === null) {
      const maxCols = Math.max(...rows.map(r => r.length));
      const colScores = Array.from({ length: maxCols }, () => ({ phone: 0, name: 0 }));

      rows.slice(0, 10).forEach(row => {
        row.forEach((cell, j) => {
          const val = String(cell || "").trim();
          // Phone pattern: mostly digits, 8+ length
          if (/^[\d+\-()\s]{8,}$/.test(val) && val.replace(/\D/g, "").length >= 8) {
            colScores[j].phone++;
          }
          // Name pattern: characters, spaces, 3+ length, no many digits
          else if (/^[A-Za-z\u0600-\u06FF\s]{3,}$/.test(val) && !/\d{3,}/.test(val)) {
            colScores[j].name++;
          }
        });
      });

      if (detectedNameCol === null) {
        let bestNameScore = 0;
        colScores.forEach((score, j) => {
          if (score.name > bestNameScore && j !== detectedPhoneCol) {
            bestNameScore = score.name;
            detectedNameCol = j;
          }
        });
      }

      if (detectedPhoneCol === null) {
        let bestPhoneScore = 0;
        colScores.forEach((score, j) => {
          if (score.phone > bestPhoneScore && j !== detectedNameCol) {
            bestPhoneScore = score.phone;
            detectedPhoneCol = j;
          }
        });
      }
    }

    if (detectedNameCol !== null) setNameCol(detectedNameCol);
    if (detectedPhoneCol !== null) setPhoneCol(detectedPhoneCol);
    setStartRow(detectedStartRow);
  };

  const handleConfirm = () => {
    if (nameCol === null || phoneCol === null) return;
    
    const contacts: Contact[] = data.slice(startRow).map(row => ({
      name: String(row[nameCol] || "").trim(),
      phone: String(row[phoneCol] || "").trim(),
    })).filter(c => c.name || c.phone);
    
    onContactsLoaded(contacts);
  };

  const reset = () => {
    setData([]);
    setNameCol(null);
    setPhoneCol(null);
    setStartRow(0);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setColumn = (index: number) => {
    if (nameCol === null) {
      setNameCol(index);
    } else if (phoneCol === null && nameCol !== index) {
      setPhoneCol(index);
    } else if (nameCol === index) {
      setNameCol(null);
    } else if (phoneCol === index) {
      setPhoneCol(null);
    }
  };

  if (data.length === 0) {
    return (
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-stone-200 rounded-xl p-12 text-center hover:bg-stone-50 transition-all cursor-pointer group bg-white"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".csv,.xlsx,.xls" 
          className="hidden" 
        />
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-stone-900 group-hover:text-white transition-all text-stone-400">
          <UploadCloud size={32} />
        </div>
        <p className="text-base font-medium text-stone-900">
          {t('upload_text')}
        </p>
        <p className="text-sm text-stone-500 mt-1">
          {t('upload_sub')}
        </p>
      </div>
    );
  }

  const maxCols = data.length > 0 ? Math.max(...data.map(row => row.length)) : 0;
  const previewData = data.slice(0, 15); // Show first 15 rows for preview

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-900">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">{fileName}</p>
            <p className="text-xs text-stone-500">{t('rows_detected', { count: data.length })}</p>
          </div>
        </div>
        <button 
          onClick={reset}
          className="text-xs text-stone-500 hover:text-red-500 font-medium transition-colors border border-stone-200 px-3 py-1.5 rounded-lg hover:border-red-100 hover:bg-red-50"
        >
          {t('change_file')}
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-wrap gap-4 items-end">
           <div className="flex-1 min-w-[200px]">
              <label className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                <User size={12} className="text-blue-500" />
                {t('select_name_col')}
              </label>
              <select 
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${
                  nameCol !== null ? "border-blue-200 ring-2 ring-blue-500/5" : "border-stone-200"
                }`}
                value={nameCol ?? ""}
                onChange={(e) => setNameCol(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">{t('column')} ...</option>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <option key={i} value={i}>{t('column')} {String.fromCharCode(65 + i)}</option>
                ))}
              </select>
           </div>
           <div className="flex-1 min-w-[200px]">
              <label className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                <Hash size={12} className="text-green-500" />
                {t('select_phone_col')}
              </label>
              <select 
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${
                  phoneCol !== null ? "border-green-200 ring-2 ring-green-500/5" : "border-stone-200"
                }`}
                value={phoneCol ?? ""}
                onChange={(e) => setPhoneCol(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">{t('column')} ...</option>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <option key={i} value={i}>{t('column')} {String.fromCharCode(65 + i)}</option>
                ))}
              </select>
           </div>
           <div className="w-24">
              <label className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                {t('start_row')}
              </label>
              <input 
                type="number"
                min={0}
                max={data.length - 1}
                value={startRow}
                onChange={(e) => setStartRow(Number(e.target.value))}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
           </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
          <table className="w-full text-[13px] text-left rtl:text-right border-collapse table-fixed min-w-full">
            <thead className="sticky top-0 z-20">
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-3 border-r border-stone-200 text-stone-400 font-normal w-12 text-center bg-stone-50 z-30 sticky left-0">#</th>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <th 
                    key={i} 
                    onClick={() => setColumn(i)}
                    className={`p-3 border-r border-stone-200 font-medium cursor-pointer select-none transition-all min-w-[180px] relative group bg-stone-50 hover:bg-stone-100 ${
                      nameCol === i ? "bg-blue-100/90 ring-inset ring-2 ring-blue-500 z-10" : 
                      phoneCol === i ? "bg-green-100/90 ring-inset ring-2 ring-green-500 z-10" : 
                      "text-stone-500"
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-tighter font-bold opacity-60">
                          {t('column')} {String.fromCharCode(65 + i)}
                        </span>
                        {nameCol === i && (
                          <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <User size={10} /> {t('select_name_col')}
                          </span>
                        )}
                        {phoneCol === i && (
                          <span className="bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Hash size={10} /> {t('select_phone_col')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`truncate text-xs ${nameCol === i || phoneCol === i ? "font-bold text-stone-900" : ""}`}>
                          {nameCol === i ? t('select_name_col') : 
                           phoneCol === i ? t('select_phone_col') : 
                           t('column') + " " + String.fromCharCode(65 + i)}
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {previewData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`hover:bg-stone-50/50 transition-colors group ${
                    rowIndex < startRow ? "opacity-30 grayscale-[0.5]" : ""
                  }`}
                >
                  <td className="p-3 border-r border-stone-200 text-stone-400 text-center bg-stone-50/30 sticky left-0 group-hover:bg-stone-100 transition-colors">
                    {rowIndex + 1}
                    {rowIndex === startRow && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900" title="Start Row"></div>
                    )}
                  </td>
                  {Array.from({ length: maxCols }).map((_, colIndex) => (
                    <td 
                      key={colIndex} 
                      onClick={() => setColumn(colIndex)}
                      className={`p-3 border-r border-stone-200 truncate cursor-pointer transition-all ${
                        nameCol === colIndex ? "bg-blue-50/40 font-medium text-blue-900 border-x-blue-200" : 
                        phoneCol === colIndex ? "bg-green-50/40 font-medium text-green-900 border-x-green-200" : ""
                      } ${rowIndex < startRow ? "bg-stone-50/50" : ""}`}
                    >
                      {String(row[colIndex] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length > 15 && (
          <div className="p-4 bg-stone-50/50 text-center text-stone-400 text-xs border-t border-stone-100 font-medium">
            {t('more_rows', { count: data.length - 15 })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {nameCol === null || phoneCol === null ? (
           <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs">
              <Info size={16} />
              <span>{t('select_both_warning')}</span>
           </div>
        ) : null}
        
        <button
          onClick={handleConfirm}
          disabled={nameCol === null || phoneCol === null}
          className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            nameCol !== null && phoneCol !== null
              ? "bg-stone-900 text-white hover:bg-stone-800 shadow-xl shadow-stone-900/10 hover:-translate-y-0.5"
              : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}
        >
          <Check size={20} />
          {t('confirm_selection')}
        </button>
      </div>
    </div>
  );
}

