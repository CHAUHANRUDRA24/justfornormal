/**
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

// Configured accounts
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
    // Ensure 8th column header is created_by if missing
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

// 1. GET_MONTHLY_DATA - Fetch monthly budgets and expenses with single source of truth
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
  
  // Sort expenses newest first
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

// 2. START_MONTH - If month already exists with an amount, returns existing without duplicate/overwrite
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

// 3. SET_MONTHLY_AMOUNT - Explicitly updates the monthly total for a month
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

// 4. ADD_MONEY (Cumulative Addition: New Total = Current Shared Total + Added Amount)
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

// 5. ADD_EXPENSE (with concurrency, balance verification, and created_by tracking)
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

// 6. UPDATE_EXPENSE
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

// 7. DELETE_EXPENSE
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

// 8. GET_SUMMARY
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
}
