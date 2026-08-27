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
    
    if (action === 'START_MONTH' || action === 'SET_MONTHLY_AMOUNT') {
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
  }
}

// 1. GET_MONTHLY_DATA
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
    
    if (id) {
      const exp = { id, month, amount, type: 'expense', category, description, date, created_at };
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

// 2. SET_MONTHLY_AMOUNT / START_MONTH
function setMonthlyAmount(monthlySheet, expensesSheet, month, amount) {
  if (!month || amount <= 0) {
    return { success: false, error: 'Invalid month or amount' };
  }
  
  const monthlyRows = monthlySheet.getDataRange().getValues();
  let foundRowIndex = -1;
  
  for (let i = 1; i < monthlyRows.length; i++) {
    if (String(monthlyRows[i][0] || '').trim() === month) {
      foundRowIndex = i + 1; // 1-based index in Sheet
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

// 3. ADD_MONEY (Cumulative Addition: New Total = Current Total + Added Amount)
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

// 4. ADD_EXPENSE (with concurrency & overspending validation)
function addExpense(monthlySheet, expensesSheet, payload) {
  const month = payload.month;
  const amount = Math.round(Number(payload.amount));
  const category = payload.category || 'Other';
  const description = payload.description || category;
  const date = payload.date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  if (!month || amount <= 0) {
    return { success: false, error: 'Please enter a valid expense amount greater than 0' };
  }
  
  // Concurrency Check: Fetch latest balance directly from Google Sheets
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
  expensesSheet.appendRow([id, month, amount, category, description, date, now]);
  
  return getMonthlyData(monthlySheet, expensesSheet, month);
}

// 5. UPDATE_EXPENSE
function updateExpense(monthlySheet, expensesSheet, payload) {
  const id = String(payload.id);
  const newAmount = Math.round(Number(payload.amount));
  const category = payload.category;
  const description = payload.description;
  const date = payload.date;
  const month = payload.month;
  
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
  
  // Overspending validation
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
  expensesSheet.getRange(foundRowIndex, 3).setValue(newAmount);
  
  return getMonthlyData(monthlySheet, expensesSheet, expMonth);
}

// 6. DELETE_EXPENSE
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

// 7. GET_SUMMARY
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
