import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

export function DashboardView({ onSelectTicket }) {
  const { user, isEmployee } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getStats();
      setData(res);
      if (isManual) toast.success('Dashboard metrics refreshed from database.');
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = data?.stats;
  const recent = data?.recent_activity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>IT Operations Intelligence</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
              Live SQLite Data
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time infrastructure health and ticket lifecycle distribution
          </p>
        </div>

        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Employee Quick Personal Banner if applicable */}
      {isEmployee && stats?.my_stats && (
        <div className="bg-gradient-to-r from-blue-900 to-navy-900 text-white rounded-2xl p-5 shadow-lg border border-navy-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your HelpDesk Profile</span>
              </div>
              <h3 className="text-lg font-bold mt-1">Hello, {user.full_name}</h3>
              <p className="text-xs text-slate-300">
                You have reported <span className="font-bold text-white">{stats.my_stats.total} total tickets</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                <div className="text-xs text-slate-300 font-medium">In Progress / Open</div>
                <div className="text-xl font-black text-amber-300">{stats.my_stats.open}</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                <div className="text-xs text-slate-300 font-medium">Resolved</div>
                <div className="text-xl font-black text-emerald-300">{stats.my_stats.completed}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Required KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Open Issues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Issues</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {loading ? '—' : stats?.open_issues ?? 0}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Active / Open
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Open & in-progress incidents</p>
        </div>

        {/* 2. Urgent Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Urgent Requests</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600">
              {loading ? '—' : stats?.urgent_requests ?? 0}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Immediate Attention
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Unresolved urgent priority tickets</p>
        </div>

        {/* 3. Assigned Tickets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Tickets</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {loading ? '—' : stats?.assigned_tickets ?? 0}
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              With Tech
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Technician assigned & non-closed</p>
        </div>

        {/* 4. Completed Work */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Work</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">
              {loading ? '—' : stats?.completed_work ?? 0}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Resolved
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tickets resolved or closed</p>
        </div>
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Category Distribution</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">{stats?.total_tickets || 0} Total</span>
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'hardware', label: 'Hardware', color: 'bg-indigo-500' },
              { key: 'network', label: 'Network', color: 'bg-cyan-500' },
              { key: 'software', label: 'Software', color: 'bg-violet-500' },
              { key: 'account-access', label: 'Account Access', color: 'bg-emerald-500' },
            ].map((cat) => {
              const count = stats?.category_counts?.[cat.key] || 0;
              const total = stats?.total_tickets || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={cat.key}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">{cat.label}</span>
                    <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Priority Breakdown</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">Severity</span>
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'urgent', label: 'Urgent', color: 'bg-rose-500' },
              { key: 'high', label: 'High', color: 'bg-orange-500' },
              { key: 'medium', label: 'Medium', color: 'bg-amber-500' },
              { key: 'low', label: 'Low', color: 'bg-slate-400' },
            ].map((prio) => {
              const count = stats?.priority_counts?.[prio.key] || 0;
              const total = stats?.total_tickets || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={prio.key}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700 capitalize">{prio.label}</span>
                    <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${prio.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Database Transitions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">Live DB</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-64">
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No recent changes logged.</p>
            ) : (
              recent.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectTicket && onSelectTicket(item.ticket_id)}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="font-mono text-blue-600">{item.ticket_id}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate mt-0.5">{item.ticket_title}</div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      {item.old_status ? (
                        <>
                          <StatusBadge status={item.old_status} size="xs" />
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <StatusBadge status={item.new_status} size="xs" />
                        </>
                      ) : (
                        <StatusBadge status={item.new_status} size="xs" />
                      )}
                    </div>
                    <span className="text-slate-500 font-medium truncate max-w-[120px]">
                      {item.changed_by_name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
