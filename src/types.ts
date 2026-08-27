export type TransactionType = 'expense' | 'monthly_budget';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM e.g. "2026-08"
  created_at: string; // ISO string
  user_id?: string;
}

// Backward-compatible alias
export type Expense = Transaction;

export interface MoneyAddition {
  id: string;
  amount: number;
  note: string;
  date: string;
  createdAt: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'Food', name: 'Food', emoji: '🍔', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  { id: 'Travel', name: 'Travel', emoji: '🚌', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { id: 'Shopping', name: 'Shopping', emoji: '🛍', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  { id: 'College', name: 'College', emoji: '🎓', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { id: 'Recharge', name: 'Recharge', emoji: '⚡', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { id: 'Entertainment', name: 'Entertainment', emoji: '🎬', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { id: 'Other', name: 'Other', emoji: '📦', color: 'text-slate-700', bgColor: 'bg-slate-100' },
];
