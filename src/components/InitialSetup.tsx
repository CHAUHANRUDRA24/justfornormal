import React, { useState } from 'react';
import { ArrowRight, Wallet, Loader2, LogOut, User, Lock, RefreshCw } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';
import { UserProfile } from '../types';

interface InitialSetupProps {
  monthKey: string;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onRefresh?: () => void;
  onSetInitial: (amount: number, note?: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
}

export const InitialSetup: React.FC<InitialSetupProps> = ({
  monthKey,
  currentUser,
  onLogout,
  onRefresh,
  onSetInitial,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const numericAmount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
  const monthTitle = formatMonthLabel(monthKey);
  const isFather = currentUser?.role === 'dad' || currentUser?.username?.toLowerCase() === 'shani';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFather) {
      setError('Only Father (Shani) has permission to add or start monthly budget.');
      return;
    }
    if (numericAmount <= 0) {
      setError('Please enter an amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const res = await Promise.resolve(onSetInitial(numericAmount, `Starting Budget for ${monthTitle}`));
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to save starting monthly amount');
    }
  };

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await Promise.resolve(onRefresh());
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const userBadgeLabel = currentUser
    ? currentUser.role === 'dad'
      ? '🧔 Dad (Shani)'
      : '🧑 Me (Rudra)'
    : '👤 User';

  return (
    <div id="initial-setup-screen" className="min-h-screen bg-slate-100/80 flex flex-col justify-center items-center px-4 py-8">
      {/* Top Bar for User & Logout */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs text-xs font-bold text-slate-700">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>Logged in as: <strong>{userBadgeLabel}</strong></span>
        </div>
        {onLogout && (
          <button
            type="button"
            id="initial-setup-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-100 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-3 h-3" />
            <span>Switch User</span>
          </button>
        )}
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        {/* If user is Father (Shani), show the Add Monthly Money form */}
        {isFather ? (
          <>
            {/* Header Icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-2xs">
                <Wallet className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Add Monthly Money
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

              {/* Action Button: Start Month */}
              <button
                id="start-month-btn"
                type="submit"
                disabled={numericAmount <= 0 || isSubmitting}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Starting Month...</span>
                  </>
                ) : (
                  <>
                    <span>Start Month</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* If user is Rudra (Son), show waiting state that only Father can add money */
          <div className="text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100 shadow-2xs">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                No Budget Set for {monthTitle}
              </h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Only <strong>Father (Shani)</strong> has permission to add starting money or adjust monthly funds.
              </p>
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 mt-4 text-xs font-medium text-amber-900 text-left">
                Once Dad logs in and sets the budget for {monthTitle}, the money will automatically sync here in real time.
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              {onRefresh && (
                <button
                  type="button"
                  id="rudra-check-budget-btn"
                  onClick={handleRefreshClick}
                  disabled={isRefreshing}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Checking Google Sheets...' : 'Check for Updates'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Shared balance will sync automatically across all family devices.
          </p>
        </div>
      </div>
    </div>
  );
};
