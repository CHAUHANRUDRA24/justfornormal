import React, { useState } from 'react';
import { useExpenseTracker } from './hooks/useExpenseTracker';
import { InitialSetup } from './components/InitialSetup';
import { Header } from './components/Header';
import { MainBalanceCard } from './components/MainBalanceCard';
import { ExpenseHistoryList } from './components/ExpenseHistoryList';
import { CategorySpendingSummary } from './components/CategorySpendingSummary';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddMoneyModal } from './components/AddMoneyModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { EditMonthlyAmountModal } from './components/EditMonthlyAmountModal';
import { FamilyAuthScreen } from './components/FamilyAuthScreen';
import { GoogleSheetsConfigModal } from './components/GoogleSheetsConfigModal';
import { Expense, UserProfile } from './types';

const AUTH_KEY = 'family_expense_auth';
const USER_KEY = 'family_expense_user';

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.username === 'Shani' || parsed.username === 'Rudra')) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored user:', e);
  }
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(AUTH_KEY) === 'true' && !!getStoredUser()) : false;
  });

  const {
    selectedMonth,
    setSelectedMonth,
    allRecordedMonths,
    isInitialized,
    isInitialLoading,
    monthlyAmount,
    totalSpent,
    remainingMoney,
    expenses,
    categorySummary,
    syncStatus,
    isConfigured,
    startMonth,
    addMoney,
    setMonthlyAmount,
    addExpense,
    editExpense,
    deleteExpense,
    resetMonth,
    refreshData,
  } = useExpenseTracker(currentUser);

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isEditMonthlyOpen, setIsEditMonthlyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleLogin = (user: UserProfile) => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    refreshData(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // 1. Family Login Screen
  if (!isAuthenticated) {
    return (
      <>
        <FamilyAuthScreen
          onLogin={handleLogin}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isConfigured={isConfigured}
        />
        <GoogleSheetsConfigModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => refreshData(true)}
        />
      </>
    );
  }

  // 2. Initial sync check while verifying shared Google Sheets balance
  if (isInitialLoading && !isInitialized && isConfigured) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 tracking-wide">Syncing shared family budget...</p>
      </div>
    );
  }

  // 3. If no monthly budget set for the selected month, prompt for initial monthly amount (Start Month)
  if (!isInitialized) {
    return (
      <>
        <InitialSetup
          monthKey={selectedMonth}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSetInitial={(amt, note) => {
            return startMonth(amt, note);
          }}
        />
        <GoogleSheetsConfigModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => refreshData(true)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col items-center pb-12">
      {/* Top Header with Month Selector, Sync, Settings, Reset Month & Logout */}
      <Header
        selectedMonth={selectedMonth}
        allMonths={allRecordedMonths}
        onSelectMonth={setSelectedMonth}
        onResetMonth={resetMonth}
        hasData={isInitialized}
        syncStatus={syncStatus}
        currentUser={currentUser}
        onRefresh={() => refreshData(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container constrained to mobile max-width */}
      <main className="w-full max-w-md px-3 sm:px-4 flex-1">
        {/* 1. Main Balance Card (Remaining Money = Monthly Amount - Total Expenses, + Add Money and - Add Expense) */}
        <MainBalanceCard
          monthKey={selectedMonth}
          remainingMoney={remainingMoney}
          monthlyAmount={monthlyAmount}
          totalSpent={totalSpent}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenAddMoney={() => setIsAddMoneyOpen(true)}
        />

        {/* 2. Recent Spending (Expense cards with edit & delete) */}
        <ExpenseHistoryList
          expenses={expenses}
          onEditExpense={(exp) => setEditingExpense(exp)}
          onDeleteExpense={deleteExpense}
        />

        {/* 3. Where I Spent (Category breakdown summary) */}
        <CategorySpendingSummary
          summary={categorySummary}
          totalSpent={totalSpent}
        />
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSaveExpense={addExpense}
        remainingMoney={remainingMoney}
      />

      <AddMoneyModal
        isOpen={isAddMoneyOpen}
        onClose={() => setIsAddMoneyOpen(false)}
        currentAmount={monthlyAmount}
        monthKey={selectedMonth}
        onAddMoney={addMoney}
      />

      <EditExpenseModal
        isOpen={editingExpense !== null}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdateExpense={editExpense}
        onDeleteExpense={deleteExpense}
        remainingMoney={remainingMoney}
      />

      <EditMonthlyAmountModal
        isOpen={isEditMonthlyOpen}
        onClose={() => setIsEditMonthlyOpen(false)}
        currentAmount={monthlyAmount}
        monthKey={selectedMonth}
        onSaveAmount={(amt) => {
          return setMonthlyAmount(amt);
        }}
      />

      <GoogleSheetsConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => refreshData(true)}
      />
    </div>
  );
}
