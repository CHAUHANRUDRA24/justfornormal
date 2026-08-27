import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Expense } from '../types';
import { googleSheetsService, isGoogleSheetsConfigured } from '../services/googleSheetsService';

export function getCurrentMonthKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const CACHE_KEY = 'family_expense_tracker_cache_v1';

interface CachedData {
  monthlyBudgets: Record<string, number>;
  expenses: Expense[];
}

function loadCachedData(): CachedData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        monthlyBudgets: parsed.monthlyBudgets || {},
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      };
    }
  } catch (e) {
    console.error('Failed to load local cached data:', e);
  }
  return {
    monthlyBudgets: {},
    expenses: [],
  };
}

function saveCachedData(data: CachedData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save cached data:', e);
  }
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export function useExpenseTracker() {
  const [data, setData] = useState<CachedData>(loadCachedData);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(isGoogleSheetsConfigured());
  const isFetchingRef = useRef(false);

  // Sync cache to localStorage
  useEffect(() => {
    saveCachedData(data);
  }, [data]);

  // Fetch fresh data from Google Sheets
  const refreshData = useCallback(async (showLoading = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showLoading) {
      setSyncStatus('syncing');
    }

    try {
      if (!isGoogleSheetsConfigured()) {
        setIsConfigured(false);
        setSyncStatus('offline');
        isFetchingRef.current = false;
        return;
      }

      setIsConfigured(true);
      const res = await googleSheetsService.getMonthlyData('');
      
      if (res && res.success) {
        setData((prev) => ({
          monthlyBudgets: {
            ...prev.monthlyBudgets,
            ...(res.monthlyBudgets || (res.month && res.monthly_amount ? { [res.month]: res.monthly_amount } : {})),
          },
          expenses: res.expenses || prev.expenses,
        }));
        setSyncStatus('synced');
        setError(null);
      } else {
        setSyncStatus('error');
        if (res?.error) setError(res.error);
      }
    } catch (err: any) {
      console.warn('Google Sheets sync warning:', err);
      setSyncStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // 1. Initial fetch on mount
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // 2. Refresh on window focus (when switching between apps or phones)
  useEffect(() => {
    const handleFocus = () => {
      refreshData(false);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshData]);

  // 3. Periodic background sync every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Monthly budget for selected month
  const monthlyAmount = useMemo(() => {
    return data.monthlyBudgets[selectedMonth] || 0;
  }, [data.monthlyBudgets, selectedMonth]);

  const isInitialized = monthlyAmount > 0;

  // Expenses for the selected month
  const currentExpenses = useMemo(() => {
    return data.expenses
      .filter((exp) => exp.month === selectedMonth)
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
  }, [data.expenses, selectedMonth]);

  // Total spent in the selected month
  const totalSpent = useMemo(() => {
    return currentExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [currentExpenses]);

  // Remaining Money = Monthly Amount - Total Expenses
  const remainingMoney = useMemo(() => {
    return Math.max(0, monthlyAmount - totalSpent);
  }, [monthlyAmount, totalSpent]);

  // Category breakdown summary
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of currentExpenses) {
      const cat = exp.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + Number(exp.amount));
    }

    const list: { category: string; amount: number; percentage: number }[] = [];
    for (const [category, amount] of map.entries()) {
      const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
      list.push({ category, amount, percentage });
    }

    return list.sort((a, b) => b.amount - a.amount);
  }, [currentExpenses, totalSpent]);

  // List of all recorded months
  const allRecordedMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(getCurrentMonthKey());
    set.add(selectedMonth);
    Object.keys(data.monthlyBudgets).forEach((m) => set.add(m));
    data.expenses.forEach((e) => {
      if (e.month) set.add(e.month);
    });
    return Array.from(set).sort().reverse();
  }, [data.monthlyBudgets, data.expenses, selectedMonth]);

  // Start Month / Set Initial Monthly Budget
  const startMonth = useCallback(
    async (amount: number, _note?: string) => {
      const numAmount = Math.round(Number(amount));
      if (numAmount <= 0) return { success: false, error: 'Please enter a valid amount greater than ₹0' };

      // Optimistic update
      setData((prev) => ({
        ...prev,
        monthlyBudgets: {
          ...prev.monthlyBudgets,
          [selectedMonth]: numAmount,
        },
      }));

      // Remote sync with Google Sheets
      if (isGoogleSheetsConfigured()) {
        setSyncStatus('syncing');
        try {
          const res = await googleSheetsService.setMonthlyAmount(selectedMonth, numAmount);
          if (res && res.success) {
            setSyncStatus('synced');
            refreshData(false);
          } else {
            setSyncStatus('error');
            if (res?.error) return { success: false, error: res.error };
          }
        } catch (err: any) {
          setSyncStatus('error');
          console.error(err);
        }
      }

      return { success: true };
    },
    [selectedMonth, refreshData]
  );

  // Add Money (Cumulative: Total = Current Total + Additional Money)
  const addMoney = useCallback(
    async (additionalAmount: number, _note?: string) => {
      const addVal = Math.round(Number(additionalAmount));
      if (addVal <= 0) return { success: false, error: 'Please enter an amount greater than ₹0' };

      // Optimistic update
      setData((prev) => {
        const currentBudget = prev.monthlyBudgets[selectedMonth] || 0;
        return {
          ...prev,
          monthlyBudgets: {
            ...prev.monthlyBudgets,
            [selectedMonth]: currentBudget + addVal,
          },
        };
      });

      // Remote sync with Google Sheets
      if (isGoogleSheetsConfigured()) {
        setSyncStatus('syncing');
        try {
          const res = await googleSheetsService.addMoney(selectedMonth, addVal);
          if (res && res.success) {
            setSyncStatus('synced');
            refreshData(false);
          } else {
            setSyncStatus('error');
            if (res?.error) return { success: false, error: res.error };
          }
        } catch (err: any) {
          setSyncStatus('error');
          console.error(err);
        }
      }

      return { success: true };
    },
    [selectedMonth, refreshData]
  );

  // Set Monthly Budget
  const setMonthlyAmount = useCallback(
    async (amount: number, note?: string) => {
      return await startMonth(amount, note);
    },
    [startMonth]
  );

  // Add Expense
  const addExpense = useCallback(
    async (expenseData: {
      amount: number;
      category: string;
      description: string;
      date?: string;
    }) => {
      const numAmount = Math.round(Number(expenseData.amount));
      if (numAmount <= 0) {
        return { success: false, error: 'Please enter an amount greater than ₹0' };
      }

      // Check available balance
      if (numAmount > remainingMoney) {
        return {
          success: false,
          error: `Insufficient Balance. You only have ₹${new Intl.NumberFormat('en-IN').format(
            remainingMoney
          )} remaining.`,
        };
      }

      const entryDate = expenseData.date || new Date().toISOString().split('T')[0];
      const entryMonth = entryDate.substring(0, 7) || selectedMonth;

      const newExpense: Expense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: numAmount,
        type: 'expense',
        description: expenseData.description.trim() || expenseData.category,
        category: expenseData.category || 'Other',
        date: entryDate,
        month: entryMonth,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setData((prev) => ({
        ...prev,
        expenses: [newExpense, ...prev.expenses],
      }));

      // Save to Google Sheets
      if (isGoogleSheetsConfigured()) {
        setSyncStatus('syncing');
        try {
          const res = await googleSheetsService.addExpense({
            month: entryMonth,
            amount: numAmount,
            category: newExpense.category,
            description: newExpense.description,
            date: entryDate,
          });

          if (res && res.success) {
            setSyncStatus('synced');
            refreshData(false);
          } else if (res && !res.success) {
            // Revert optimistic update
            setData((prev) => ({
              ...prev,
              expenses: prev.expenses.filter((e) => e.id !== newExpense.id),
            }));
            setSyncStatus('error');
            return {
              success: false,
              error: res.error || 'Failed to save expense in Google Sheets',
            };
          }
        } catch (err: any) {
          setSyncStatus('error');
          console.error(err);
        }
      }

      return { success: true };
    },
    [remainingMoney, selectedMonth, refreshData]
  );

  // Edit Expense
  const editExpense = useCallback(
    async (
      id: string,
      updatedData: {
        amount: number;
        category: string;
        description: string;
        date?: string;
      }
    ) => {
      const existing = data.expenses.find((e) => e.id === id);
      if (!existing) return { success: false, error: 'Expense not found' };

      const numAmount = Math.round(Number(updatedData.amount));
      if (numAmount <= 0) return { success: false, error: 'Please enter an amount greater than ₹0' };

      const available = remainingMoney + existing.amount;
      if (numAmount > available) {
        return {
          success: false,
          error: `Insufficient Balance. Amount exceeds available balance (₹${new Intl.NumberFormat('en-IN').format(
            available
          )}).`,
        };
      }

      const entryDate = updatedData.date || existing.date;
      const entryMonth = entryDate.substring(0, 7) || existing.month;

      // Optimistic update
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === id
            ? {
                ...e,
                amount: numAmount,
                category: updatedData.category || e.category,
                description: updatedData.description.trim() || updatedData.category,
                date: entryDate,
                month: entryMonth,
              }
            : e
        ),
      }));

      // Remote update
      if (isGoogleSheetsConfigured()) {
        setSyncStatus('syncing');
        try {
          const res = await googleSheetsService.updateExpense({
            id,
            month: entryMonth,
            amount: numAmount,
            category: updatedData.category || existing.category,
            description: updatedData.description.trim() || existing.category,
            date: entryDate,
          });

          if (res && res.success) {
            setSyncStatus('synced');
            refreshData(false);
          } else {
            setSyncStatus('error');
            if (res?.error) return { success: false, error: res.error };
          }
        } catch (err: any) {
          setSyncStatus('error');
          console.error(err);
        }
      }

      return { success: true };
    },
    [data.expenses, remainingMoney, refreshData]
  );

  // Delete Expense
  const deleteExpense = useCallback(
    async (id: string) => {
      const existing = data.expenses.find((e) => e.id === id);
      const expMonth = existing ? existing.month : selectedMonth;

      // Optimistic delete
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      }));

      // Remote delete
      if (isGoogleSheetsConfigured()) {
        setSyncStatus('syncing');
        try {
          const res = await googleSheetsService.deleteExpense(id, expMonth);
          if (res && res.success) {
            setSyncStatus('synced');
            refreshData(false);
          } else {
            setSyncStatus('error');
            if (res?.error) return { success: false, error: res.error };
          }
        } catch (err: any) {
          setSyncStatus('error');
          console.error(err);
        }
      }

      return { success: true };
    },
    [data.expenses, selectedMonth, refreshData]
  );

  // Reset Month
  const resetMonth = useCallback(async () => {
    setData((prev) => {
      const nextBudgets = { ...prev.monthlyBudgets };
      delete nextBudgets[selectedMonth];
      return {
        monthlyBudgets: nextBudgets,
        expenses: prev.expenses.filter((e) => e.month !== selectedMonth),
      };
    });

    if (isGoogleSheetsConfigured()) {
      try {
        await googleSheetsService.setMonthlyAmount(selectedMonth, 0);
        refreshData(false);
      } catch (e) {
        console.error(e);
      }
    }

    return { success: true };
  }, [selectedMonth, refreshData]);

  return {
    selectedMonth,
    setSelectedMonth,
    allRecordedMonths,
    isInitialized,
    monthlyAmount,
    totalSpent,
    remainingMoney,
    expenses: currentExpenses,
    categorySummary,
    syncStatus,
    error,
    isConfigured,
    startMonth,
    addMoney,
    setMonthlyAmount,
    addExpense,
    editExpense,
    deleteExpense,
    resetMonth,
    refreshData,
  };
}
