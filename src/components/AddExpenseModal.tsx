import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../types';
import { formatINR } from '../utils/format';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (data: {
    amount: number;
    category: string;
    description: string;
    date?: string;
  }) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  remainingMoney: number;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  remainingMoney,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setCategory('Food');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  const isOverspending = numericAmount > remainingMoney;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    if (numericAmount > remainingMoney) {
      setErrorMessage(`Expense cannot be greater than your remaining amount (${formatINR(remainingMoney)}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await Promise.resolve(
      onSaveExpense({
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
      setErrorMessage(res.error || 'Failed to save expense');
    }
  };

  const handleQuickAdd = (val: number) => {
    const current = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
    const nextVal = current + val;
    setAmountStr(nextVal.toString());
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container / Bottom Sheet */}
      <div
        id="add-expense-modal"
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">+ Add Expense</h2>
            <p className="text-xs text-slate-500">
              Remaining Money: <strong className="text-emerald-700">{formatINR(remainingMoney)}</strong>
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
            <label htmlFor="expense-amount-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <span className="text-2xl font-bold text-slate-500">₹</span>
              </div>
              <input
                id="expense-amount-input"
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

            {/* Quick Add Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>

            {/* Overspending / Error warning */}
            {isOverspending && (
              <div id="insufficient-balance-warning" className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="block font-bold">Insufficient balance</strong>
                  You only have {formatINR(remainingMoney)} remaining. Expense cannot exceed your balance.
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
                    id={`category-btn-${cat.name.toLowerCase()}`}
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

          {/* Description / Note */}
          <div>
            <label htmlFor="expense-note-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description (Optional)
            </label>
            <input
              id="expense-note-input"
              type="text"
              placeholder="e.g. Lunch, Groceries, Shoes, Petrol"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-800"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="expense-date-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Date
            </label>
            <input
              id="expense-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-800"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              id="save-expense-submit-btn"
              type="submit"
              disabled={numericAmount <= 0 || isOverspending || isSubmitting}
              className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
