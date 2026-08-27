import React, { useState } from 'react';
import { Calendar, ChevronDown, RotateCcw, AlertTriangle, RefreshCw, FileSpreadsheet, LogOut } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';
import { SyncStatus } from '../hooks/useExpenseTracker';

interface HeaderProps {
  selectedMonth: string;
  allMonths: string[];
  onSelectMonth: (month: string) => void;
  onResetMonth: () => void;
  hasData: boolean;
  syncStatus?: SyncStatus;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  allMonths,
  onSelectMonth,
  onResetMonth,
  hasData,
  syncStatus = 'synced',
  onRefresh,
  onOpenSettings,
  onLogout,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <header className="w-full max-w-md mx-auto pt-4 pb-2 px-3 sm:px-4 flex items-center justify-between gap-2">
        {/* Month Selector Dropdown */}
        <div className="relative flex items-center">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-3 py-1.5 rounded-2xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <select
              id="month-selector"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="font-bold text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              {allMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-1" />
          </div>
        </div>

        {/* Right action tools: Sync, Sheets Config, Reset Month, Logout */}
        <div className="flex items-center gap-1.5">
          {/* Manual Refresh / Sync Status */}
          {onRefresh && (
            <button
              id="sync-refresh-btn"
              type="button"
              onClick={onRefresh}
              title="Sync with Google Sheets"
              className="p-2 text-slate-400 hover:text-emerald-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}

          {/* Google Sheets Settings */}
          {onOpenSettings && (
            <button
              id="sheets-settings-btn"
              type="button"
              onClick={onOpenSettings}
              title="Google Sheets Settings"
              className="p-2 text-slate-400 hover:text-emerald-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset Current Month */}
          {hasData && (
            <button
              id="reset-data-btn"
              type="button"
              onClick={() => setShowConfirm(true)}
              title="Reset current month"
              className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              id="logout-btn"
              type="button"
              onClick={onLogout}
              title="Log out from family account"
              className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Reset Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Reset {formatMonthLabel(selectedMonth)}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will clear the monthly budget and all recorded expenses for {formatMonthLabel(selectedMonth)}.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-reset-btn"
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  onResetMonth();
                }}
                className="py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
