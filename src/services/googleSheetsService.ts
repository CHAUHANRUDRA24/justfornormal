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

export const googleSheetsService = {
  // 1. Fetch monthly data & expenses
  async getMonthlyData(month: string): Promise<MonthlyDataResponse> {
    return await callAppsScript('GET_MONTHLY_DATA', { month });
  },

  // 2. Set monthly budget amount
  async setMonthlyAmount(month: string, amount: number): Promise<MonthlyDataResponse> {
    return await callAppsScript('SET_MONTHLY_AMOUNT', { month, amount });
  },

  // 3. Add an expense
  async addExpense(expense: {
    month: string;
    amount: number;
    category: string;
    description: string;
    date?: string;
  }): Promise<MonthlyDataResponse> {
    return await callAppsScript('ADD_EXPENSE', expense);
  },

  // 4. Update an expense
  async updateExpense(expense: {
    id: string;
    month: string;
    amount: number;
    category: string;
    description: string;
    date?: string;
  }): Promise<MonthlyDataResponse> {
    return await callAppsScript('UPDATE_EXPENSE', expense);
  },

  // 5. Delete an expense
  async deleteExpense(id: string, month: string): Promise<{ success: boolean; error?: string }> {
    return await callAppsScript('DELETE_EXPENSE', { id, month });
  },

  // 6. Get summary
  async getSummary(month: string): Promise<any> {
    return await callAppsScript('GET_SUMMARY', { month });
  },
};
