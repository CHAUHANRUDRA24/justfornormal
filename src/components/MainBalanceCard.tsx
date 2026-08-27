import React from 'react';
import { Plus, Minus, AlertCircle, PlusCircle } from 'lucide-react';
import { formatINR, formatMonthLabel } from '../utils/format';

interface MainBalanceCardProps {
  monthKey: string;
  remainingMoney: number;
  monthlyAmount: number;
  totalSpent: number;
  onOpenAddExpense: () => void;
  onOpenAddMoney: () => void;
}

export const MainBalanceCard: React.FC<MainBalanceCardProps> = ({
  monthKey,
  remainingMoney,
  monthlyAmount,
  totalSpent,
  onOpenAddExpense,
  onOpenAddMoney,
}) => {
  const isZero = remainingMoney === 0;
  const monthTitle = formatMonthLabel(monthKey);

  return (
    <div id="main-balance-card" className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-4">
      {/* Top Month Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          This Month ({monthTitle})
        </span>
        {isZero && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Zero Balance
          </span>
        )}
      </div>

      {/* Main Big Remaining Balance Number */}
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

      {/* Monthly Money & Total Spent Sub-grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex flex-col pl-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Money</span>
          <span id="monthly-amount-display" className="text-lg font-extrabold text-slate-800 mt-0.5">
            {formatINR(monthlyAmount)}
          </span>
        </div>

        <div className="flex flex-col border-l border-slate-200/80 pl-3.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Spent</span>
          <span id="total-spent-display" className="text-lg font-extrabold text-rose-600 mt-0.5">
            {formatINR(totalSpent)}
          </span>
        </div>
      </div>

      {/* Dual Action Buttons: + Add Money and - Add Expense */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* + Add Money Button */}
        <button
          id="open-add-money-btn"
          type="button"
          onClick={onOpenAddMoney}
          className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-2xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>+ Add Money</span>
        </button>

        {/* - Add Expense Button */}
        <button
          id="add-expense-btn"
          type="button"
          onClick={onOpenAddExpense}
          className="py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-2xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>− Add Expense</span>
        </button>
      </div>
    </div>
  );
};
