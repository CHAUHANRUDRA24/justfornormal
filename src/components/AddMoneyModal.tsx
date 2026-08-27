import React, { useState, useEffect } from 'react';
import { X, Check, PlusCircle, ArrowUpRight } from 'lucide-react';
import { formatINR, formatMonthLabel } from '../utils/format';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  monthKey: string;
  onAddMoney: (amount: number, note?: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
}

const QUICK_ADD_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  isOpen,
  onClose,
  currentAmount,
  monthKey,
  onAddMoney,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setNote('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  const newTotal = currentAmount + numericAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await Promise.resolve(onAddMoney(numericAmount, note.trim() || undefined));
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to add money');
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
      <div className="fixed inset-0" onClick={onClose} />

      <div
        id="add-money-modal"
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">+ Add Money</h2>
              <p className="text-xs text-slate-500">For {formatMonthLabel(monthKey)}</p>
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

        <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-5">
          {/* Current & New Total Overview Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Current Monthly Total</span>
              <span className="font-bold text-slate-700">{formatINR(currentAmount)}</span>
            </div>
            {numericAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold border-t border-slate-200/60 pt-2">
                <span>Adding Money</span>
                <span>+{formatINR(numericAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
              <span>New Monthly Total</span>
              <span className="text-emerald-600 text-base">{formatINR(newTotal)}</span>
            </div>
          </div>

          {/* Amount to Add Input */}
          <div>
            <label htmlFor="add-money-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Enter Amount to Add
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <span className="text-2xl font-bold text-slate-500">₹</span>
              </div>
              <input
                id="add-money-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="10,000"
                value={amountStr ? new Intl.NumberFormat('en-IN').format(numericAmount) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(cleaned);
                  setErrorMessage(null);
                }}
                className="w-full pl-11 pr-4 py-3.5 text-2xl font-extrabold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-300 text-slate-900"
              />
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick:</span>
              {QUICK_ADD_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>

            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 mt-1.5">{errorMessage}</p>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="add-money-note-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Source / Note (Optional)
            </label>
            <input
              id="add-money-note-input"
              type="text"
              placeholder="e.g. Papa added, Extra cash, Salary"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all text-slate-800"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              id="submit-add-money-btn"
              type="submit"
              disabled={numericAmount <= 0 || isSubmitting}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Adding Money...' : '+ Add Money'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
