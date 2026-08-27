import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Users, Settings2, FileSpreadsheet } from 'lucide-react';

interface FamilyAuthScreenProps {
  onLogin: () => void;
  onOpenSettings: () => void;
  isConfigured: boolean;
}

export const FamilyAuthScreen: React.FC<FamilyAuthScreenProps> = ({
  onLogin,
  onOpenSettings,
  isConfigured,
}) => {
  const [username, setUsername] = useState('family');
  const [password, setPassword] = useState('mypassword123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    // Default shared family credentials (or any valid family login)
    if (
      (username.trim().toLowerCase() === 'family' && password === 'mypassword123') ||
      (username.trim().length >= 3 && password.length >= 4)
    ) {
      onLogin();
    } else {
      setError('Invalid username or password. Default is family / mypassword123');
    }
  };

  return (
    <div id="family-auth-screen" className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-2xs">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Family Expense Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Shared expense account for you and your father
          </p>
        </div>

        {/* Status banner for Google Sheets */}
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets Backend</span>
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
              placeholder="family"
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
                placeholder="mypassword123"
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
            className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Log In to Family Account</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Security badge & note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Both phones access the same real-time Google Sheet</span>
        </div>
      </div>
    </div>
  );
};
