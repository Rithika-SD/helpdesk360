import React, { useState } from 'react';
import { LifeBuoy, ShieldCheck, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEMO_ACCOUNTS = [
  {
    role: 'technician',
    name: 'David Miller',
    username: 'tech_david',
    password: 'Password123!',
    tag: 'Lead Tech',
  },
  {
    role: 'technician',
    name: 'Elena Rostova',
    username: 'tech_elena',
    password: 'Password123!',
    tag: 'SysAdmin',
  },
  {
    role: 'employee',
    name: 'Sarah Connor',
    username: 'emp_sarah',
    password: 'Password123!',
    tag: 'Staff',
  },
  {
    role: 'employee',
    name: 'Alex Johnson',
    username: 'emp_alex',
    password: 'Password123!',
    tag: 'Staff',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      toast.success(`Welcome back, ${user.full_name}!`);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMessage('');
    setLoading(true);
    try {
      const user = await login(acc.username, acc.password);
      toast.success(`Logged in as ${user.full_name} (${user.role})!`);
    } catch (err) {
      setErrorMessage(err.message || 'Quick login failed.');
      toast.error(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
            <LifeBuoy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">HelpDesk 360</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enterprise IT Incident & Request Lifecycle Management
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Username
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. emp_sarah or tech_david"
                  disabled={loading}
                  className="block w-full pl-9 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-slate-400 transition"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="block w-full pl-9 pr-10 py-2.5 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-slate-400 transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 border-t border-slate-200/80 pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hackathon Demo Quick Login
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">1-Click Test</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  disabled={loading}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {acc.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        acc.role === 'technician'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {acc.tag}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                    @{acc.username}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Default password for all accounts: <code className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Password123!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
