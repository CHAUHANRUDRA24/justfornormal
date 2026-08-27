import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';

interface EditMonthlyAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  monthKey: string;
  onSaveAmount: (amount: number) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
}

export const EditMonthlyAmountModal: React.FC<EditMonthlyAmountModalProps> = ({
  isOpen,
  onClose,
  currentAmount,
  monthKey,
  onSaveAmount,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr(currentAmount ? currentAmount.toString() : '');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentAmount]);

  if (!isOpen) return null;

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await Promise.resolve(onSaveAmount(numericAmount));
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to update monthly amount');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        id="edit-monthly-amount-modal"
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden z-10"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Monthly Amount</h2>
            <p className="text-xs text-slate-500">For {formatMonthLabel(monthKey)}</p>
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
          <div>
            <label htmlFor="monthly-amount-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Enter New Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <span className="text-2xl font-bold text-slate-500">₹</span>
              </div>
              <input
                id="monthly-amount-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="50,000"
                value={amountStr ? new Intl.NumberFormat('en-IN').format(numericAmount) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(cleaned);
                  setErrorMessage(null);
                }}
                className="w-full pl-11 pr-4 py-3.5 text-2xl font-extrabold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-300 text-slate-900"
              />
            </div>
            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 mt-1.5">{errorMessage}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              id="save-monthly-amount-btn"
              type="submit"
              disabled={numericAmount <= 0 || isSubmitting}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Saving...' : 'Update Monthly Amount'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
