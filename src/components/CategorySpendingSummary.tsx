import React from 'react';
import { formatINR, getCategoryEmoji } from '../utils/format';
import { DEFAULT_CATEGORIES } from '../types';

interface CategorySummaryItem {
  category: string;
  amount: number;
  percentage: number;
}

interface CategorySpendingSummaryProps {
  summary: CategorySummaryItem[];
  totalSpent: number;
}

export const CategorySpendingSummary: React.FC<CategorySpendingSummaryProps> = ({
  summary,
  totalSpent,
}) => {
  if (summary.length === 0 || totalSpent === 0) {
    return null;
  }

  return (
    <div id="where-i-spent-section" className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Where I Spent
        </h3>
        <span className="text-xs font-bold text-slate-700">
          Total: {formatINR(totalSpent)}
        </span>
      </div>

      <div className="space-y-3">
        {summary.map((item) => {
          const catConfig = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === item.category.toLowerCase());
          const emoji = catConfig?.emoji || getCategoryEmoji(item.category);

          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">{emoji}</span>
                  <span className="font-bold text-slate-800">{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{formatINR(item.amount)}</span>
                  <span className="text-xs font-semibold text-slate-400 w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              {/* Clean minimal progress bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, item.percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
