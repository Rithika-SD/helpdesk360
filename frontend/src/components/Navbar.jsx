import React from 'react';
import { LifeBuoy, LayoutDashboard, ListFilter, PlusCircle, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, isTechnician, logout } = useAuth();

  return (
    <header className="bg-navy-900 border-b border-navy-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LifeBuoy className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">HelpDesk</span>
                <span className="font-black text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  360
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Enterprise IT Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'tickets'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>{isTechnician ? 'All Tickets Queue' : 'My Tickets'}</span>
            </button>

            {!isTechnician && (
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'create'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Ticket</span>
              </button>
            )}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-navy-800 pr-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight">{user?.full_name}</div>
                <div className="text-[11px] text-slate-400 font-mono">@{user?.username}</div>
              </div>

              {/* Role Badge */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                  isTechnician
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {isTechnician ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Technician</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Employee</span>
                  </>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-navy-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Submenu */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-navy-800 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'dashboard' ? 'text-white bg-blue-600' : 'text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'tickets' ? 'text-white bg-blue-600' : 'text-slate-400'
            }`}
          >
            {isTechnician ? 'Queue' : 'My Tickets'}
          </button>
          {!isTechnician && (
            <button
              onClick={() => setActiveTab('create')}
              className={`py-1.5 px-3 rounded-lg font-semibold ${
                activeTab === 'create' ? 'text-white bg-blue-600' : 'text-slate-400'
              }`}
            >
              Create
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
