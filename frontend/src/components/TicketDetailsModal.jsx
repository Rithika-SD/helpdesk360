import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Shield, ArrowRight, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CategoryBadge } from './CategoryBadge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function TicketDetailsModal({ ticketId, isOpen, onClose, onTicketUpdated, technicians = [] }) {
  const { isTechnician } = useAuth();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states for technicians
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchDetails = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await api.getTicket(ticketId);
      setTicket(res.ticket);
      setSelectedTech(res.ticket.assigned_to ? String(res.ticket.assigned_to) : '');
      setSelectedStatus(res.ticket.status);
    } catch (err) {
      toast.error(err.message || 'Failed to load ticket details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchDetails();
    }
  }, [isOpen, ticketId]);

  if (!isOpen) return null;

  const handleAssignChange = async (newTechId) => {
    setUpdating(true);
    try {
      const targetId = newTechId === '' ? null : Number(newTechId);
      const res = await api.assignTicket(ticketId, targetId);
      toast.success(res.message);
      setSelectedTech(newTechId);
      fetchDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to update technician assignment.');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status) return;
    setUpdating(true);
    try {
      const res = await api.updateTicketStatus(ticketId, newStatus);
      toast.success(res.message);
      setSelectedStatus(newStatus);
      fetchDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket status.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold px-2.5 py-1 rounded bg-slate-200/80 text-slate-800">
              {ticket ? ticket.id : 'Loading...'}
            </span>
            {ticket && (
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <CategoryBadge category={ticket.category} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !ticket ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm">Fetching ticket records from database...</p>
            </div>
          ) : (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{ticket.title}</h2>
                <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Reported By</div>
                    <div className="text-sm font-semibold text-slate-800 mt-0.5">{ticket.reporter_name}</div>
                    <div className="text-xs text-slate-500 font-mono">@{ticket.reporter_username}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 font-medium">Assigned Technician</div>
                    {isTechnician ? (
                      <div className="mt-1">
                        <select
                          value={selectedTech}
                          onChange={(e) => handleAssignChange(e.target.value)}
                          disabled={updating}
                          className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.full_name} (@{tech.username})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-slate-800 mt-0.5">
                        {ticket.assigned_technician_display || 'Unassigned'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Created Time (UTC)</div>
                    <div className="text-xs font-medium text-slate-700 mt-0.5">{formatDate(ticket.created_at)}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Last Updated (UTC)</div>
                    <div className="text-xs font-medium text-slate-700 mt-0.5">{formatDate(ticket.updated_at)}</div>
                  </div>
                </div>
              </div>

              {/* Technician Status Controls */}
              {isTechnician && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Technician Workflow: Update Status
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['open', 'in-progress', 'resolved', 'closed'].map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => handleStatusChange(statusOption)}
                        disabled={updating || ticket.status === statusOption}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          ticket.status === statusOption
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50'
                        }`}
                      >
                        {statusOption.replace('-', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Status History Timeline</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {ticket.history ? ticket.history.length : 0} events
                  </span>
                </div>

                {!ticket.history || ticket.history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No status changes recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {ticket.history.map((event, idx) => (
                      <div key={event.id || idx} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              {event.old_status ? (
                                <>
                                  <StatusBadge status={event.old_status} size="xs" />
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                  <StatusBadge status={event.new_status} size="xs" />
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-500 font-normal">Created ticket with status</span>
                                  <StatusBadge status={event.new_status} size="xs" />
                                </>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDate(event.changed_at)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                            <span>Changed by</span>
                            <span className="font-semibold text-slate-700">{event.changed_by_name}</span>
                            <span className="text-slate-400">({event.changed_by_role})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
