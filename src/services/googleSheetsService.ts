import { Expense } from '../types';

const STORAGE_URL_KEY = 'family_expense_apps_script_url';

export function getAppsScriptUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  return (storedUrl || envUrl).trim();
}

export function saveAppsScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
  }
}

export function isGoogleSheetsConfigured(): boolean {
  const url = getAppsScriptUrl();
  return Boolean(url && url.startsWith('https://script.google.com/macros/s/'));
}

export interface MonthlyDataResponse {
  success: boolean;
  error?: string;
  month?: string;
  monthly_amount?: number;
  monthlyBudgets?: Record<string, number>;
  expenses?: Expense[];
  totalSpent?: number;
  remainingMoney?: number;
}

/**
 * Execute request to Google Apps Script Web App
 */
async function callAppsScript(action: string, payload: Record<string, any> = {}): Promise<any> {
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    throw new Error('Google Apps Script URL is not configured.');
  }

  const postData = {
    action,
    ...payload,
  };

  try {
    // Sending as text/plain avoids CORS preflight failures on Google Apps Script Web Apps
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script error: HTTP ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  } catch (err: any) {
    console.error('Apps Script request failed:', err);
    throw new Error(err.message || 'Unable to connect to Google Sheets.');
  }
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  username?: string;
  name?: string;
  role?: 'dad' | 'me';
}

export const googleSheetsService = {
  // 0. Verify Login
  async login(username: string, password: string): Promise<LoginResponse> {
    return await callAppsScript('LOGIN', { username, password });
  },

  // 1. Fetch monthly data & expenses
  async getMonthlyData(month: string): Promise<MonthlyDataResponse> {
    return await callAppsScript('GET_MONTHLY_DATA', { month });
  },

  // 2. Set monthly budget amount / Start Month
  async startMonth(month: string, amount: number, username?: string): Promise<MonthlyDataResponse> {
    return await callAppsScript('START_MONTH', { month, amount, username });
  },

  async setMonthlyAmount(month: string, amount: number, username?: string): Promise<MonthlyDataResponse> {
    return await callAppsScript('SET_MONTHLY_AMOUNT', { month, amount, username });
  },

  // 3. Add Money (Increment monthly total cumulatively)
  async addMoney(month: string, amount: number, username?: string): Promise<MonthlyDataResponse> {
    return await callAppsScript('ADD_MONEY', { month, amount, username });
  },

  // 4. Add an expense with created_by
  async addExpense(expense: {
    month: string;
    amount: number;
    category: string;
    description: string;
    date?: string;
    created_by?: string;
    username?: string;
  }): Promise<MonthlyDataResponse> {
    return await callAppsScript('ADD_EXPENSE', expense);
  },

  // 5. Update an expense
  async updateExpense(expense: {
    id: string;
    month: string;
    amount: number;
    category: string;
    description: string;
    date?: string;
    created_by?: string;
    username?: string;
  }): Promise<MonthlyDataResponse> {
    return await callAppsScript('UPDATE_EXPENSE', expense);
  },

  // 6. Delete an expense
  async deleteExpense(id: string, month: string): Promise<{ success: boolean; error?: string }> {
    return await callAppsScript('DELETE_EXPENSE', { id, month });
  },

  // 7. Get summary
  async getSummary(month: string): Promise<any> {
    return await callAppsScript('GET_SUMMARY', { month });
  },
};
