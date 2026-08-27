import React from 'react';
import { Transaction } from '../types';
import { formatINR, formatDateLabel, getSmartEmoji } from '../utils/format';
import { Edit2, Trash2, ShoppingBag } from 'lucide-react';

interface ExpenseHistoryListProps {
  expenses: Transaction[];
  onEditExpense: (expense: Transaction) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpenseHistoryList: React.FC<ExpenseHistoryListProps> = ({
  expenses,
  onEditExpense,
  onDeleteExpense,
}) => {
  if (expenses.length === 0) {
    return (
      <div id="expense-history-section" className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          My Spending
        </h3>
        <div className="py-8 text-center flex flex-col items-center justify-center text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2 border border-slate-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No spending recorded yet</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Tap <strong>+ Add Expense</strong> to record your spending.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="expense-history-section" className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          My Spending
        </h3>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {expenses.map((expense) => {
          const emoji = getSmartEmoji(expense.description, expense.category);

          return (
            <div
              key={expense.id}
              id={`expense-item-${expense.id}`}
              className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-slate-50/60 -mx-2 px-2 rounded-2xl transition-colors cursor-pointer"
              onClick={() => onEditExpense(expense)}
            >
              {/* Left: Emoji + Category/Description + Date */}
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200/60">
                  {emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                      {expense.description || expense.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {formatDateLabel(expense.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-medium text-slate-400">
                      {expense.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Amount & Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {formatINR(expense.amount)}
                </span>

                <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title="Edit Expense"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditExpense(expense);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete Expense"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteExpense(expense.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
