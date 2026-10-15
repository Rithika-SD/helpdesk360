import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CategoryBadge } from '../components/CategoryBadge';

export function EmployeeView({ activeSubTab = 'tickets', onSelectTicket, initialTab = 'tickets' }) {
  const { user } = useAuth();
  const toast = useToast();

  const [currentTab, setCurrentTab] = useState(initialTab); // 'tickets' or 'create'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('hardware');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [createdSummary, setCreatedSummary] = useState(null);

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getTickets({
        search: search.trim(),
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
      });
      setTickets(res.tickets || []);
      if (isManual) toast.success('Your tickets refreshed.');
    } catch (err) {
      toast.error(err.message || 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, categoryFilter, priorityFilter]);

  const validateForm = () => {
    const errors = {};
    if (!title.trim()) errors.title = 'Ticket title is required.';
    else if (title.trim().length > 200) errors.title = 'Title must be under 200 characters.';

    if (!description.trim()) errors.description = 'Detailed description is required.';
    else if (description.trim().length > 3000) errors.description = 'Description must be under 3000 characters.';

    if (!['hardware', 'network', 'software', 'account-access'].includes(category)) {
      errors.category = 'Please choose a valid category.';
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errors.priority = 'Please choose a valid priority.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setCreatedSummary(null);

    try {
      const res = await api.createTicket({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
      });

      toast.success(res.message);
      setCreatedSummary(res.ticket);
      setTitle('');
      setDescription('');
      setCategory('hardware');
      setPriority('medium');
      setFormErrors({});
      fetchTickets();
    } catch (err) {
      toast.error(err.message || 'Failed to create ticket.');
      if (err.data?.details) {
        setFormErrors(err.data.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-nav switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              currentTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>My Reported Tickets ({tickets.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              currentTab === 'create'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Ticket</span>
          </button>
        </div>

        {currentTab === 'tickets' && (
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* VIEW 1: CREATE TICKET FORM */}
      {currentTab === 'create' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {createdSummary && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm">Ticket Successfully Created!</div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Assigned Ticket ID: <span className="font-mono font-bold">{createdSummary.id}</span>. Our IT engineering team has been notified.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectTicket(createdSummary.id)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
                    >
                      View Ticket Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('tickets')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg transition"
                    >
                      Go to My Tickets Queue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Submit IT Support Ticket</h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide comprehensive details about the issue you are experiencing so our technicians can triage efficiently.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">{title.length}/200</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cannot connect to staging VPN after OS reboot"
                  disabled={submitting}
                  className={`w-full text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 bg-white transition ${
                    formErrors.title
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.title}</span>
                  </p>
                )}
              </div>

              {/* Category & Priority Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={submitting}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="hardware">Hardware (Monitor, Laptop, Peripherals)</option>
                    <option value="network">Network (VPN, Wi-Fi, DNS, Gateways)</option>
                    <option value="software">Software (OS, Docker, Applications)</option>
                    <option value="account-access">Account Access (Permissions, Passwords, SSO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={submitting}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="low">Low - Minor inconvenience</option>
                    <option value="medium">Medium - Normal business request</option>
                    <option value="high">High - Degraded productivity</option>
                    <option value="urgent">Urgent - Work-stopping outage</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">{description.length}/3000</span>
                </div>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the exact error messages, steps to reproduce, hardware serial number, or relevant context..."
                  disabled={submitting}
                  className={`w-full text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 bg-white transition leading-relaxed ${
                    formErrors.description
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.description}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setDescription('');
                    setFormErrors({});
                  }}
                  disabled={submitting}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Clear Fields
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: MY TICKETS LIST */}
      {currentTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your tickets by title or ticket ID..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="hardware">Hardware</option>
                <option value="network">Network</option>
                <option value="software">Software</option>
                <option value="account-access">Account Access</option>
              </select>
            </div>
          </div>

          {/* Tickets Display */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Querying your tickets from SQLite...</p>
            </div>
          ) : tickets.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Tickets Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {search || statusFilter || categoryFilter || priorityFilter
                  ? 'No tickets match the selected search or filter criteria. Try clearing filters.'
                  : 'You have not submitted any IT support tickets yet. Click below to submit your first issue.'}
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setCurrentTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit New Ticket</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Title & Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Tech</th>
                      <th className="py-3 px-4">Created / Updated</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                        onClick={() => onSelectTicket(t.id)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                          {t.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 leading-tight line-clamp-1 max-w-xs">
                            {t.title}
                          </div>
                          <div className="mt-1">
                            <CategoryBadge category={t.category} />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              t.assigned_to_name
                                ? 'text-slate-800'
                                : 'text-slate-400 italic'
                            }`}
                          >
                            {t.assigned_technician_display || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          <div>{formatDate(t.created_at)}</div>
                          <div className="text-slate-400 text-[10px]">Upd: {formatDate(t.updated_at)}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(t.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <span>Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
