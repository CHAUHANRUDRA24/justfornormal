import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Transaction, DEFAULT_CATEGORIES } from '../types';
import { formatINR } from '../utils/format';

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Transaction | null;
  onClose: () => void;
  onUpdateExpense: (
    id: string,
    data: { amount: number; category: string; description: string; date?: string }
  ) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  onDeleteExpense: (id: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  remainingMoney: number;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  onClose,
  onUpdateExpense,
  onDeleteExpense,
  remainingMoney,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && expense) {
      setAmountStr(expense.amount.toString());
      setCategory(expense.category || 'Other');
      setDescription(expense.description || '');
      setDate(expense.date || new Date().toISOString().split('T')[0]);
      setErrorMessage(null);
      setShowDeleteConfirm(false);
      setIsSubmitting(false);
    }
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  // Available budget for this expense = current remaining + original amount of this expense
  const availableBudget = remainingMoney + expense.amount;
  const isOverspending = numericAmount > availableBudget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    if (numericAmount > availableBudget) {
      setErrorMessage(
        `Amount exceeds available balance (${formatINR(availableBudget)}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await Promise.resolve(
      onUpdateExpense(expense.id, {
        amount: numericAmount,
        category,
        description: description.trim() || category,
        date,
      })
    );

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to update expense');
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const res = await Promise.resolve(onDeleteExpense(expense.id));
    setIsSubmitting(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to delete expense');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        id="edit-expense-modal"
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Expense</h2>
            <p className="text-xs text-slate-500">
              Max available: <strong className="text-emerald-700">{formatINR(availableBudget)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-5">
          {/* Amount Field */}
          <div>
            <label htmlFor="edit-expense-amount-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <span className="text-2xl font-bold text-slate-500">₹</span>
              </div>
              <input
                id="edit-expense-amount-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="0"
                value={amountStr ? new Intl.NumberFormat('en-IN').format(numericAmount) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(cleaned);
                  setErrorMessage(null);
                }}
                className={`w-full pl-11 pr-4 py-3.5 text-2xl font-extrabold bg-slate-50 border-2 rounded-2xl focus:bg-white focus:outline-none transition-all placeholder:text-slate-300 text-slate-900 ${
                  isOverspending ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900' : 'border-slate-200 focus:border-rose-500'
                }`}
              />
            </div>

            {isOverspending && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="block font-bold">Insufficient balance</strong>
                  Maximum amount you can spend is {formatINR(availableBudget)}.
                </div>
              </div>
            )}

            {errorMessage && !isOverspending && (
              <p className="text-xs font-semibold text-rose-600 mt-1.5">{errorMessage}</p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`py-2.5 px-3 rounded-2xl flex flex-col items-center justify-center gap-1 border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs scale-[1.02]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-expense-note-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </label>
            <input
              id="edit-expense-note-input"
              type="text"
              placeholder="e.g. Lunch, Groceries, Shoes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-800"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="edit-expense-date-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Date
            </label>
            <input
              id="edit-expense-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-800"
            />
          </div>

          {/* Buttons: Update & Delete */}
          <div className="pt-2 space-y-2.5">
            <button
              id="update-expense-submit-btn"
              type="submit"
              disabled={numericAmount <= 0 || isOverspending || isSubmitting}
              className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Updating...' : 'Update Expense'}</span>
            </button>

            {!showDeleteConfirm ? (
              <button
                type="button"
                id="edit-expense-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete this expense</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-rose-800 text-center">
                  Are you sure you want to delete this expense?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-expense-btn"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-xs"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
