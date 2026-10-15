import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Shield,
  User,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function TechnicianView({ onSelectTicket, technicians = [] }) {
  const { user } = useAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'newest', 'oldest', 'updated'

  // Action states for confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null, // 'status' or 'assign'
    ticketId: null,
    newValue: null,
    isDangerous: false,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getTickets({
        search: search.trim(),
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        sort: sortBy,
      });
      setTickets(res.tickets || []);
      if (isManual) toast.success('Technician ticket queue refreshed.');
    } catch (err) {
      toast.error(err.message || 'Failed to fetch ticket queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const requestStatusChange = (ticket, newStatus) => {
    if (ticket.status === newStatus) return;
    const isDangerous = newStatus === 'closed';
    setConfirmModal({
      isOpen: true,
      title: `Update Ticket ${ticket.id} Status`,
      message: `Are you sure you want to transition ticket "${ticket.title}" from "${ticket.status}" to "${newStatus}"? This change will be permanently logged in the status history.`,
      actionType: 'status',
      ticketId: ticket.id,
      newValue: newStatus,
      isDangerous,
    });
  };

  const requestAssignChange = (ticket, newTechId) => {
    const targetTech = technicians.find((t) => String(t.id) === String(newTechId));
    const targetName = targetTech ? targetTech.full_name : 'Unassigned';
    setConfirmModal({
      isOpen: true,
      title: `Reassign Ticket ${ticket.id}`,
      message: `Reassign ticket "${ticket.title}" to ${targetName}?`,
      actionType: 'assign',
      ticketId: ticket.id,
      newValue: newTechId === '' ? null : Number(newTechId),
      isDangerous: false,
    });
  };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      if (confirmModal.actionType === 'status') {
        const res = await api.updateTicketStatus(confirmModal.ticketId, confirmModal.newValue);
        toast.success(res.message);
      } else if (confirmModal.actionType === 'assign') {
        const res = await api.assignTicket(confirmModal.ticketId, confirmModal.newValue);
        toast.success(res.message);
      }
      setConfirmModal({ ...confirmModal, isOpen: false });
      fetchTickets();
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Quick Queue Metrics
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length;
  const unassignedCount = tickets.filter((t) => !t.assigned_to && t.status !== 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Queue Highlights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>IT Engineering Ticket Queue</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
              Technician Workspace
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Triage, assign, prioritize, and manage end-to-end incident resolutions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Queue Alert Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Total in View</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{tickets.length}</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <FolderOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-rose-500">Urgent Pending</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">{urgentCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-amber-600">Unassigned Tickets</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">{unassignedCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Shield className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets by title, ticket ID (HD-xxxx)..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Status: All</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Priority: All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Category: All</option>
              <option value="hardware">Hardware</option>
              <option value="network">Network</option>
              <option value="software">Software</option>
              <option value="account-access">Account Access</option>
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="priority">Sort: Urgent First</option>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="updated">Sort: Recently Updated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Queue Table */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading technician ticket queue from SQLite...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No tickets match your active filter criteria. Clear filters or search term to view all tickets.
          </p>
          {(search || statusFilter || priorityFilter || categoryFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status & Action</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition"
                  >
                    {/* ID & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600">{t.id}</span>
                        <CategoryBadge category={t.category} />
                      </div>
                      <div
                        onClick={() => onSelectTicket(t.id)}
                        className="font-semibold text-slate-900 mt-1 hover:text-blue-600 cursor-pointer line-clamp-1 max-w-xs"
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    {/* Status & Quick Status Update */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={t.status}
                          onChange={(e) => requestStatusChange(t, e.target.value)}
                          className="text-[11px] font-semibold rounded-lg border border-slate-300 px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{t.reporter_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{t.reporter_username}</div>
                    </td>

                    {/* Assign Technician Dropdown */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={t.assigned_to ? String(t.assigned_to) : ''}
                        onChange={(e) => requestAssignChange(t, e.target.value)}
                        className={`text-[11px] font-medium rounded-lg border px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                          t.assigned_to
                            ? 'border-slate-300 text-slate-800'
                            : 'border-amber-300 text-amber-700 bg-amber-50/50'
                        }`}
                      >
                        <option value="">Unassigned</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.full_name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Timeline */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                      <div>Created: {formatDate(t.created_at)}</div>
                      <div className="text-slate-400 text-[10px]">Updated: {formatDate(t.updated_at)}</div>
                    </td>

                    {/* View Details */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectTicket(t.id)}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Yes, Proceed"
        isDangerous={confirmModal.isDangerous}
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
