import React from 'react';
import { Plus, Edit3, AlertCircle } from 'lucide-react';
import { formatINR, formatMonthLabel } from '../utils/format';

interface MainBalanceCardProps {
  monthKey: string;
  remainingMoney: number;
  monthlyAmount: number;
  totalSpent: number;
  onOpenAddExpense: () => void;
  onEditMonthlyAmount: () => void;
}

export const MainBalanceCard: React.FC<MainBalanceCardProps> = ({
  monthKey,
  remainingMoney,
  monthlyAmount,
  totalSpent,
  onOpenAddExpense,
  onEditMonthlyAmount,
}) => {
  const isZero = remainingMoney === 0;
  const monthTitle = formatMonthLabel(monthKey);

  return (
    <div id="main-balance-card" className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-4">
      {/* Top Month Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {monthTitle.toUpperCase()}
        </span>
        {isZero && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Zero Balance
          </span>
        )}
      </div>

      {/* Main Big Remaining Number */}
      <div className="text-center py-2">
        <div
          id="remaining-money-display"
          className={`text-4xl sm:text-5xl font-black tracking-tight ${
            isZero ? 'text-rose-600' : 'text-slate-900'
          }`}
        >
          {formatINR(remainingMoney)}
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Remaining Money
        </p>

        {isZero && (
          <p id="zero-balance-message" className="text-xs font-medium text-rose-600 mt-2 bg-rose-50/80 py-1 px-3 rounded-lg inline-block">
            You have no money remaining for this month.
          </p>
        )}
      </div>

      {/* Monthly Amount & Total Spent Sub-grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex flex-col pl-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-400">Monthly Amount</span>
            <button
              type="button"
              onClick={onEditMonthlyAmount}
              title="Edit Monthly Amount"
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <Edit3 className="w-2.5 h-2.5" />
            </button>
          </div>
          <span id="monthly-amount-display" className="text-base font-extrabold text-slate-800">
            {formatINR(monthlyAmount)}
          </span>
        </div>

        <div className="flex flex-col border-l border-slate-200/80 pl-3">
          <span className="text-[11px] font-medium text-slate-400">Total Spent</span>
          <span id="total-spent-display" className="text-base font-extrabold text-rose-600">
            {formatINR(totalSpent)}
          </span>
        </div>
      </div>

      {/* Large Prominent + ADD EXPENSE Button */}
      <button
        id="add-expense-btn"
        type="button"
        onClick={onOpenAddExpense}
        className="w-full mt-4 py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>+ Add Expense</span>
      </button>
    </div>
  );
};
