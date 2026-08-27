import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, UserCheck, Settings2, FileSpreadsheet } from 'lucide-react';
import { UserProfile } from '../types';
import { googleSheetsService, isGoogleSheetsConfigured } from '../services/googleSheetsService';

interface FamilyAuthScreenProps {
  onLogin: (user: UserProfile) => void;
  onOpenSettings: () => void;
  isConfigured: boolean;
}

// ONLY the two main authorized accounts
const VALID_ACCOUNTS: Record<string, { username: string; name: string; role: 'dad' | 'me'; pass: string }> = {
  shani: { username: 'Shani', name: 'Shani (Dad)', role: 'dad', pass: 'Shani@13' },
  dad: { username: 'Shani', name: 'Shani (Dad)', role: 'dad', pass: 'Shani@13' },
  rudra: { username: 'Rudra', name: 'Rudra (Me)', role: 'me', pass: 'Rudra@2006' },
  me: { username: 'Rudra', name: 'Rudra (Me)', role: 'me', pass: 'Rudra@2006' },
};

export const FamilyAuthScreen: React.FC<FamilyAuthScreenProps> = ({
  onLogin,
  onOpenSettings,
  isConfigured,
}) => {
  const [selectedUser, setSelectedUser] = useState<'Shani' | 'Rudra' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectAccount = (user: 'Shani' | 'Rudra') => {
    setSelectedUser(user);
    setUsername(user);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Please enter username and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // 1. Try remote validation via Google Apps Script if configured
    if (isGoogleSheetsConfigured()) {
      try {
        const res = await googleSheetsService.login(username.trim(), cleanPass);
        if (res && res.success && res.username) {
          const matched = VALID_ACCOUNTS[res.username.toLowerCase()] || {
            username: res.username,
            name: res.name || res.username,
            role: res.role || (res.username.toLowerCase() === 'shani' ? 'dad' : 'me'),
            pass: cleanPass,
          };
          onLogin({
            username: matched.username,
            name: matched.name,
            role: matched.role,
          });
          setIsSubmitting(false);
          return;
        } else if (res && !res.success && res.error) {
          setError(res.error || 'Invalid username or password');
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Backend login check fell back to credential validation:', err);
      }
    }

    // 2. Client-side fallback authentication
    const account = VALID_ACCOUNTS[cleanUser];
    if (account && account.pass === cleanPass) {
      onLogin({
        username: account.username,
        name: account.name,
        role: account.role,
      });
    } else {
      setError('Invalid username or password');
    }
    setIsSubmitting(false);
  };

  return (
    <div id="family-auth-screen" className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-2xs">
            <UserCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Family Expense Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to access shared financial records
          </p>
        </div>

        {/* Quick User Selector Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            id="select-dad-account-btn"
            onClick={() => handleSelectAccount('Shani')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              selectedUser === 'Shani'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🧔 Dad</span>
            <span className="text-[10px] font-semibold text-slate-400">Shani</span>
          </button>
          <button
            type="button"
            id="select-rudra-account-btn"
            onClick={() => handleSelectAccount('Rudra')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              selectedUser === 'Rudra'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🧑 Me</span>
            <span className="text-[10px] font-semibold text-slate-400">Rudra</span>
          </button>
        </div>

        {/* Status banner for Google Sheets */}
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Shared Google Sheets Data</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200"
          >
            <Settings2 className="w-3 h-3" />
            <span>{isConfigured ? 'Connected' : 'Setup Script'}</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Username
            </label>
            <input
              type="text"
              id="username-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="Shani or Rudra"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-900 font-semibold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                id="password-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none transition-all text-slate-900 font-semibold text-sm"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 mt-1">{error}</p>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>
              {isSubmitting
                ? 'Verifying...'
                : selectedUser
                ? `Log In as ${selectedUser === 'Shani' ? 'Dad (Shani)' : 'Me (Rudra)'}`
                : 'Log In'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Security badge & note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Both accounts access the exact same shared monthly budget</span>
        </div>
      </div>
    </div>
  );
};

