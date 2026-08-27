import React, { useState } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';

interface InitialSetupProps {
  monthKey: string;
  onSetInitial: (amount: number, note?: string) => { success: boolean; error?: string };
}

export const InitialSetup: React.FC<InitialSetupProps> = ({
  monthKey,
  onSetInitial,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  const monthTitle = formatMonthLabel(monthKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setError('Please enter an amount greater than ₹0');
      return;
    }

    setError(null);
    const res = onSetInitial(numericAmount, `Initial Budget for ${monthTitle}`);

    if (!res.success) {
      setError(res.error || 'Failed to save initial amount');
    }
  };

  return (
    <div id="initial-setup-screen" className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-2xs">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Initial Monthly Amount
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter starting amount for <strong>{monthTitle}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Main Amount Input */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <span className="text-2xl font-bold text-slate-500">₹</span>
              </div>
              <input
                id="initial-amount-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="50,000"
                value={amountStr ? new Intl.NumberFormat('en-IN').format(numericAmount) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(cleaned);
                  if (error) setError(null);
                }}
                className="w-full pl-11 pr-4 py-4 text-3xl font-extrabold text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-300 tracking-tight text-center"
              />
            </div>
            {error && (
              <p className="text-rose-500 text-xs font-semibold text-center mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            id="add-initial-amount-btn"
            type="submit"
            disabled={numericAmount <= 0}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Set Monthly Budget</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Expenses will be automatically subtracted from your balance.
          </p>
        </div>
      </div>
    </div>
  );
};
