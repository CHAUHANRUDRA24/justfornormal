import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { getAppsScriptUrl, saveAppsScriptUrl } from '../services/googleSheetsService';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const APPS_SCRIPT_CODE = `/**
 * Google Apps Script for Shared Family Expense Tracker
 */
const MONTHLY_SHEET_NAME = 'Monthly Data';
const EXPENSES_SHEET_NAME = 'Expenses';

function getOrCreateSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let monthlySheet = ss.getSheetByName(MONTHLY_SHEET_NAME);
  if (!monthlySheet) {
    monthlySheet = ss.insertSheet(MONTHLY_SHEET_NAME);
    monthlySheet.appendRow(['month', 'total_available', 'updated_at']);
    monthlySheet.setFrozenRows(1);
  }
  let expensesSheet = ss.getSheetByName(EXPENSES_SHEET_NAME);
  if (!expensesSheet) {
    expensesSheet = ss.insertSheet(EXPENSES_SHEET_NAME);
    expensesSheet.appendRow(['id', 'month', 'amount', 'category', 'description', 'date', 'created_at']);
    expensesSheet.setFrozenRows(1);
  }
  return { ss, monthlySheet, expensesSheet };
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const { monthlySheet, expensesSheet } = getOrCreateSheets();
    const action = (e && e.parameter && e.parameter.action) || 'GET_MONTHLY_DATA';
    const month = (e && e.parameter && e.parameter.month) || '';
    if (action === 'GET_MONTHLY_DATA') return createJsonResponse(getMonthlyData(monthlySheet, expensesSheet, month));
    if (action === 'GET_SUMMARY') return createJsonResponse(getSummary(monthlySheet, expensesSheet, month));
    return createJsonResponse({ success: false, error: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const { monthlySheet, expensesSheet } = getOrCreateSheets();
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (ex) { payload = e.parameter || {}; }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    const action = payload.action || 'GET_MONTHLY_DATA';
    if (action === 'START_MONTH' || action === 'SET_MONTHLY_AMOUNT') {
      return createJsonResponse(setMonthlyAmount(monthlySheet, expensesSheet, payload.month, Number(payload.amount)));
    }
    if (action === 'ADD_MONEY') {
      return createJsonResponse(addMoney(monthlySheet, expensesSheet, payload.month, Number(payload.amount)));
    }
    if (action === 'ADD_EXPENSE') return createJsonResponse(addExpense(monthlySheet, expensesSheet, payload));
    if (action === 'UPDATE_EXPENSE') return createJsonResponse(updateExpense(monthlySheet, expensesSheet, payload));
    if (action === 'DELETE_EXPENSE') return createJsonResponse(deleteExpense(expensesSheet, payload.id));
    if (action === 'GET_MONTHLY_DATA') return createJsonResponse(getMonthlyData(monthlySheet, expensesSheet, payload.month));
    if (action === 'GET_SUMMARY') return createJsonResponse(getSummary(monthlySheet, expensesSheet, payload.month));
    return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function getMonthlyData(monthlySheet, expensesSheet, targetMonth) {
  const monthlyRows = monthlySheet.getDataRange().getValues();
  const monthlyBudgets = {};
  for (let i = 1; i < monthlyRows.length; i++) {
    const row = monthlyRows[i];
    const m = String(row[0] || '').trim();
    const amt = Number(row[1]) || 0;
    if (m) monthlyBudgets[m] = amt;
  }
  const expenseRows = expensesSheet.getDataRange().getValues();
  const expenses = [];
  for (let i = 1; i < expenseRows.length; i++) {
    const row = expenseRows[i];
    const id = String(row[0] || '');
    const month = String(row[1] || '').trim();
    const amount = Number(row[2]) || 0;
    const category = String(row[3] || 'Other');
    const description = String(row[4] || '');
    const date = String(row[5] || '');
    const created_at = String(row[6] || '');
    if (id) {
      const exp = { id, month, amount, type: 'expense', category, description, date, created_at };
      if (!targetMonth || month === targetMonth) expenses.push(exp);
    }
  }
  expenses.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
  const monthlyAmount = targetMonth ? (monthlyBudgets[targetMonth] || 0) : 0;
  const totalSpent = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const remainingMoney = Math.max(0, monthlyAmount - totalSpent);
  return { success: true, month: targetMonth, monthly_amount: monthlyAmount, total_available: monthlyAmount, monthlyBudgets: monthlyBudgets, expenses: expenses, totalSpent: totalSpent, remainingMoney: remainingMoney };
}

function setMonthlyAmount(monthlySheet, expensesSheet, month, amount) {
  if (!month || amount <= 0) return { success: false, error: 'Invalid month or amount' };
  const monthlyRows = monthlySheet.getDataRange().getValues();
  let foundRowIndex = -1;
  for (let i = 1; i < monthlyRows.length; i++) {
    if (String(monthlyRows[i][0] || '').trim() === month) {
      foundRowIndex = i + 1;
      break;
    }
  }
  const now = new Date().toISOString();
  if (foundRowIndex > 0) {
    monthlySheet.getRange(foundRowIndex, 2).setValue(amount);
    monthlySheet.getRange(foundRowIndex, 3).setValue(now);
  } else {
    monthlySheet.appendRow([month, amount, now]);
  }
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

function addMoney(monthlySheet, expensesSheet, month, additionalAmount) {
  const addVal = Math.round(Number(additionalAmount));
  if (!month || addVal <= 0) return { success: false, error: 'Invalid amount' };
  const monthlyRows = monthlySheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let currentTotal = 0;
  for (let i = 1; i < monthlyRows.length; i++) {
    if (String(monthlyRows[i][0] || '').trim() === month) {
      foundRowIndex = i + 1;
      currentTotal = Number(monthlyRows[i][1]) || 0;
      break;
    }
  }
  const newTotal = currentTotal + addVal;
  const now = new Date().toISOString();
  if (foundRowIndex > 0) {
    monthlySheet.getRange(foundRowIndex, 2).setValue(newTotal);
    monthlySheet.getRange(foundRowIndex, 3).setValue(now);
  } else {
    monthlySheet.appendRow([month, newTotal, now]);
  }
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

function addExpense(monthlySheet, expensesSheet, payload) {
  const month = payload.month;
  const amount = Math.round(Number(payload.amount));
  const category = payload.category || 'Other';
  const description = payload.description || category;
  const date = payload.date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  if (!month || amount <= 0) return { success: false, error: 'Please enter a valid expense amount' };
  
  const currentData = getMonthlyData(monthlySheet, expensesSheet, month);
  const monthlyAmount = currentData.monthly_amount || 0;
  const currentTotalSpent = currentData.totalSpent || 0;
  const currentRemaining = monthlyAmount - currentTotalSpent;
  if (amount > currentRemaining) {
    return { success: false, error: 'Insufficient Balance. You only have ₹' + currentRemaining.toLocaleString('en-IN') + ' remaining.', remaining: currentRemaining };
  }
  const id = payload.id || ('exp_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 6));
  expensesSheet.appendRow([id, month, amount, category, description, date, now]);
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

function updateExpense(monthlySheet, expensesSheet, payload) {
  const id = String(payload.id);
  const newAmount = Math.round(Number(payload.amount));
  if (!id || newAmount <= 0) return { success: false, error: 'Invalid expense ID or amount' };
  const expenseRows = expensesSheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let oldAmount = 0;
  let expMonth = payload.month;
  for (let i = 1; i < expenseRows.length; i++) {
    if (String(expenseRows[i][0] || '') === id) {
      foundRowIndex = i + 1;
      expMonth = String(expenseRows[i][1] || expMonth);
      oldAmount = Number(expenseRows[i][2]) || 0;
      break;
    }
  }
  if (foundRowIndex === -1) return { success: false, error: 'Expense not found' };
  const currentData = getMonthlyData(monthlySheet, expensesSheet, expMonth);
  const availableBudget = currentData.remainingMoney + oldAmount;
  if (newAmount > availableBudget) {
    return { success: false, error: 'Insufficient Balance. Amount exceeds available balance.' };
  }
  if (payload.category) expensesSheet.getRange(foundRowIndex, 4).setValue(payload.category);
  if (payload.description) expensesSheet.getRange(foundRowIndex, 5).setValue(payload.description);
  if (payload.date) expensesSheet.getRange(foundRowIndex, 6).setValue(payload.date);
  expensesSheet.getRange(foundRowIndex, 3).setValue(newAmount);
  return getMonthlyData(monthlySheet, expensesSheet, expMonth);
}

function deleteExpense(expensesSheet, id) {
  if (!id) return { success: false, error: 'Expense ID required' };
  const expenseRows = expensesSheet.getDataRange().getValues();
  for (let i = 1; i < expenseRows.length; i++) {
    if (String(expenseRows[i][0] || '') === String(id)) {
      expensesSheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Expense not found' };
}

function getSummary(monthlySheet, expensesSheet, targetMonth) {
  return getMonthlyData(monthlySheet, expensesSheet, targetMonth);
}`;

export const GoogleSheetsConfigModal: React.FC<GoogleSheetsConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState(getAppsScriptUrl());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'script'>('url');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppsScriptUrl(url.trim());
    onSaved();
    onClose();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        id="sheets-config-modal"
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheets Sync</h2>
              <p className="text-xs text-slate-500">Shared Backend for both phones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Connect Web App URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            View Apps Script Code
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'url' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Can also be configured via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_APPS_SCRIPT_URL</code> in environment variables.
                </p>
              </div>

              {/* Quick Setup Checklist */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2 text-xs text-slate-700">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Quick 4-step setup:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pl-1">
                  <li>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5">Google Sheets <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
                  <li>Paste the code from the <strong>View Apps Script Code</strong> tab</li>
                  <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (set <em>Execute as: Me</em>, <em>Who has access: Anyone</em>) and paste the URL here.</li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Code.gs (Apps Script)</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-72 leading-relaxed">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
