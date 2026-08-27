import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, FileSpreadsheet, CheckCircle2, Send, Loader2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { getAppsScriptUrl, saveAppsScriptUrl, generateSyncShareUrl, googleSheetsService } from '../services/googleSheetsService';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const APPS_SCRIPT_CODE = `/**
 * Google Apps Script for Shared Family Expense Tracker
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Replace all code in Code.gs with this script
 * 4. Click 'Deploy' > 'New deployment'
 * 5. Select type: 'Web app'
 * 6. Set Description: 'Family Expense Tracker API'
 * 7. Set 'Execute as': 'Me'
 * 8. Set 'Who has access': 'Anyone' (IMPORTANT)
 * 9. Click 'Deploy' and copy the Web App URL
 * 10. Paste the URL in the app's settings or in .env as VITE_APPS_SCRIPT_URL
 */

const MONTHLY_SHEET_NAME = 'Monthly Data';
const EXPENSES_SHEET_NAME = 'Expenses';

// Configured main accounts
const USERS = [
  { username: 'Shani', aliases: ['shani', 'dad'], password: 'Shani@13', name: 'Shani (Dad)', role: 'dad' },
  { username: 'Rudra', aliases: ['rudra', 'me'], password: 'Rudra@2006', name: 'Rudra (Me)', role: 'me' }
];

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
    expensesSheet.appendRow(['id', 'month', 'amount', 'category', 'description', 'date', 'created_at', 'created_by']);
    expensesSheet.setFrozenRows(1);
  } else {
    const headers = expensesSheet.getRange(1, 1, 1, Math.max(expensesSheet.getLastColumn(), 8)).getValues()[0];
    if (!headers[7] || headers[7] === '') {
      expensesSheet.getRange(1, 8).setValue('created_by');
    }
  }
  
  return { ss, monthlySheet, expensesSheet };
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyUser(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    if (u.aliases.indexOf(cleanUser) !== -1 || u.username.toLowerCase() === cleanUser) {
      if (u.password === cleanPass) {
        return { success: true, username: u.username, name: u.name, role: u.role };
      }
    }
  }
  return { success: false, error: 'Invalid username or password' };
}

function doGet(e) {
  try {
    const { monthlySheet, expensesSheet } = getOrCreateSheets();
    const action = (e && e.parameter && e.parameter.action) || 'GET_MONTHLY_DATA';
    const month = (e && e.parameter && e.parameter.month) || '';
    
    if (action === 'LOGIN') {
      return createJsonResponse(verifyUser(e.parameter.username, e.parameter.password));
    }
    
    if (action === 'GET_MONTHLY_DATA') {
      return createJsonResponse(getMonthlyData(monthlySheet, expensesSheet, month));
    }
    
    if (action === 'GET_SUMMARY') {
      return createJsonResponse(getSummary(monthlySheet, expensesSheet, month));
    }
    
    return createJsonResponse({ success: false, error: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Server busy processing another request. Please retry.' });
  }

  try {
    const { monthlySheet, expensesSheet } = getOrCreateSheets();
    let payload = {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    const action = payload.action || 'GET_MONTHLY_DATA';
    
    if (action === 'LOGIN') {
      return createJsonResponse(verifyUser(payload.username, payload.password));
    }
    
    if (action === 'START_MONTH') {
      return createJsonResponse(startMonth(monthlySheet, expensesSheet, payload.month, Number(payload.amount)));
    }

    if (action === 'SET_MONTHLY_AMOUNT') {
      return createJsonResponse(setMonthlyAmount(monthlySheet, expensesSheet, payload.month, Number(payload.amount)));
    }
    
    if (action === 'ADD_MONEY') {
      return createJsonResponse(addMoney(monthlySheet, expensesSheet, payload.month, Number(payload.amount)));
    }
    
    if (action === 'ADD_EXPENSE') {
      return createJsonResponse(addExpense(monthlySheet, expensesSheet, payload));
    }
    
    if (action === 'UPDATE_EXPENSE') {
      return createJsonResponse(updateExpense(monthlySheet, expensesSheet, payload));
    }
    
    if (action === 'DELETE_EXPENSE') {
      return createJsonResponse(deleteExpense(expensesSheet, payload.id));
    }
    
    if (action === 'GET_MONTHLY_DATA') {
      return createJsonResponse(getMonthlyData(monthlySheet, expensesSheet, payload.month));
    }
    
    if (action === 'GET_SUMMARY') {
      return createJsonResponse(getSummary(monthlySheet, expensesSheet, payload.month));
    }
    
    return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getMonthlyData(monthlySheet, expensesSheet, targetMonth) {
  const monthlyRows = monthlySheet.getDataRange().getValues();
  const monthlyBudgets = {};
  
  for (let i = 1; i < monthlyRows.length; i++) {
    const row = monthlyRows[i];
    const m = String(row[0] || '').trim();
    const amt = Number(row[1]) || 0;
    if (m) {
      monthlyBudgets[m] = amt;
    }
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
    const created_by = String(row[7] || '');
    
    if (id) {
      const exp = {
        id: id,
        month: month,
        amount: amount,
        type: 'expense',
        category: category,
        description: description,
        date: date,
        created_at: created_at,
        created_by: created_by
      };
      if (!targetMonth || month === targetMonth) {
        expenses.push(exp);
      }
    }
  }
  
  expenses.sort(function(a, b) {
    return new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime();
  });
  
  const monthlyAmount = targetMonth ? (monthlyBudgets[targetMonth] || 0) : 0;
  const totalSpent = expenses.reduce(function(acc, curr) {
    return acc + (Number(curr.amount) || 0);
  }, 0);
  const remainingMoney = Math.max(0, monthlyAmount - totalSpent);
  
  return {
    success: true,
    month: targetMonth,
    monthly_amount: monthlyAmount,
    total_available: monthlyAmount,
    monthlyBudgets: monthlyBudgets,
    expenses: expenses,
    totalSpent: totalSpent,
    remainingMoney: remainingMoney
  };
}

function startMonth(monthlySheet, expensesSheet, month, amount) {
  if (!month || amount <= 0) {
    return { success: false, error: 'Invalid month or amount' };
  }
  
  const monthlyRows = monthlySheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let existingAmount = 0;
  
  for (let i = 1; i < monthlyRows.length; i++) {
    if (String(monthlyRows[i][0] || '').trim() === month) {
      foundRowIndex = i + 1;
      existingAmount = Number(monthlyRows[i][1]) || 0;
      break;
    }
  }
  
  const now = new Date().toISOString();
  if (foundRowIndex > 0) {
    if (existingAmount > 0) {
      return getMonthlyData(monthlySheet, expensesSheet, month);
    }
    monthlySheet.getRange(foundRowIndex, 2).setValue(amount);
    monthlySheet.getRange(foundRowIndex, 3).setValue(now);
  } else {
    monthlySheet.appendRow([month, amount, now]);
  }
  
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

function setMonthlyAmount(monthlySheet, expensesSheet, month, amount) {
  if (!month || amount <= 0) {
    return { success: false, error: 'Invalid month or amount' };
  }
  
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
  if (!month || addVal <= 0) {
    return { success: false, error: 'Please enter a valid amount greater than ₹0' };
  }
  
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
  const created_by = payload.created_by || payload.username || 'Shani';
  
  if (!month || amount <= 0) {
    return { success: false, error: 'Please enter a valid expense amount greater than 0' };
  }
  
  const currentData = getMonthlyData(monthlySheet, expensesSheet, month);
  const monthlyAmount = currentData.monthly_amount || 0;
  const currentTotalSpent = currentData.totalSpent || 0;
  const currentRemaining = monthlyAmount - currentTotalSpent;
  
  if (amount > currentRemaining) {
    return {
      success: false,
      error: 'Insufficient Balance. You only have ₹' + currentRemaining.toLocaleString('en-IN') + ' remaining.',
      remaining: currentRemaining,
      monthly_amount: monthlyAmount,
      totalSpent: currentTotalSpent
    };
  }
  
  const id = payload.id || ('exp_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 6));
  expensesSheet.appendRow([id, month, amount, category, description, date, now, created_by]);
  
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

function updateExpense(monthlySheet, expensesSheet, payload) {
  const id = String(payload.id);
  const newAmount = Math.round(Number(payload.amount));
  const category = payload.category;
  const description = payload.description;
  const date = payload.date;
  const month = payload.month;
  const created_by = payload.created_by || payload.username;
  
  if (!id || newAmount <= 0) {
    return { success: false, error: 'Invalid expense ID or amount' };
  }
  
  const expenseRows = expensesSheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let oldAmount = 0;
  let expMonth = month;
  
  for (let i = 1; i < expenseRows.length; i++) {
    if (String(expenseRows[i][0] || '') === id) {
      foundRowIndex = i + 1;
      expMonth = String(expenseRows[i][1] || expMonth);
      oldAmount = Number(expenseRows[i][2]) || 0;
      break;
    }
  }
  
  if (foundRowIndex === -1) {
    return { success: false, error: 'Expense not found' };
  }
  
  const currentData = getMonthlyData(monthlySheet, expensesSheet, expMonth);
  const availableBudget = currentData.remainingMoney + oldAmount;
  
  if (newAmount > availableBudget) {
    return {
      success: false,
      error: 'Insufficient Balance. Amount exceeds available budget (₹' + availableBudget.toLocaleString('en-IN') + ').'
    };
  }
  
  if (category) expensesSheet.getRange(foundRowIndex, 4).setValue(category);
  if (description) expensesSheet.getRange(foundRowIndex, 5).setValue(description);
  if (date) expensesSheet.getRange(foundRowIndex, 6).setValue(date);
  if (created_by) expensesSheet.getRange(foundRowIndex, 8).setValue(created_by);
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
  const data = getMonthlyData(monthlySheet, expensesSheet, targetMonth);
  const categoryMap = {};
  
  data.expenses.forEach(function(exp) {
    const cat = exp.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
  });
  
  const categorySummary = [];
  for (const cat in categoryMap) {
    const amt = categoryMap[cat];
    const pct = data.totalSpent > 0 ? Math.round((amt / data.totalSpent) * 100) : 0;
    categorySummary.push({ category: cat, amount: amt, percentage: pct });
  }
  categorySummary.sort(function(a, b) { return b.amount - a.amount; });
  
  return {
    success: true,
    month: targetMonth,
    monthly_amount: data.monthly_amount,
    total_available: data.monthly_amount,
    total_spent: data.totalSpent,
    remaining_money: data.remainingMoney,
    category_summary: categorySummary
  };
}`;

export const GoogleSheetsConfigModal: React.FC<GoogleSheetsConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState(getAppsScriptUrl());
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'script'>('url');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppsScriptUrl(url.trim());
    onSaved();
    onClose();
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter a valid Google Apps Script Web App URL first.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('');
    try {
      saveAppsScriptUrl(url.trim());
      const res = await googleSheetsService.getMonthlyData('');
      if (res && res.success) {
        setTestStatus('success');
        setTestMessage('Connected successfully! Both devices will sync in real time.');
      } else {
        setTestStatus('error');
        setTestMessage(res?.error || 'Connection failed. Please verify the Web App deployment.');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(e.message || 'Unable to connect. Check if Web App is deployed with access: Anyone.');
    }
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

  const syncShareUrl = generateSyncShareUrl();

  const handleCopyShareLink = async () => {
    if (!syncShareUrl) return;
    try {
      await navigator.clipboard.writeText(syncShareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWhatsAppShare = () => {
    if (!syncShareUrl) return;
    const msg = encodeURIComponent(
      `Open this link on your phone to connect to our shared Family Expense Tracker:\n\n${syncShareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Multi-Device Synchronization</h2>
              <p className="text-xs text-slate-500">Shared Backend for Father & Rudra</p>
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
            Connect & Share
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
            <div className="space-y-4">
              {/* 1-Click Share Sync Link to Second Phone */}
              {url.trim().startsWith('https://script.google.com/macros/s/') && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant Link for 2nd Phone (Dad / Rudra)</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                    Open this link on the other phone to connect to the exact same Google Sheet. Both phones will always stay synchronized with identical numbers.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="py-2.5 px-3 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setTestStatus('idle');
                    }}
                    className="w-full px-3.5 py-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Or set <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_APPS_SCRIPT_URL</code> in environment variables.
                  </p>
                </div>

                {/* Test Connection feedback */}
                {testStatus === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                )}
                {testStatus === 'error' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                )}

                {/* Action Buttons: Test Connection & Save */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing' || !url.trim()}
                    className="py-3 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {testStatus === 'testing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{testStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Sync</span>
                  </button>
                </div>
              </form>

              {/* Quick Setup Checklist */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  How to setup shared Google Sheet (4 steps):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pl-1">
                  <li>Create a new spreadsheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Click <strong>Extensions &gt; Apps Script</strong></li>
                  <li>Copy code from <strong>View Apps Script Code</strong> tab and paste into <code className="font-mono">Code.gs</code></li>
                  <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (Set <em>Execute as: Me</em>, <em>Who has access: Anyone</em>) and paste URL here.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Code.gs (Apps Script Backend)</span>
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
