import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { EmployeeView } from './pages/EmployeeView';
import { TechnicianView } from './pages/TechnicianView';
import { TicketDetailsModal } from './components/TicketDetailsModal';
import { api } from './api/client';

function MainApp() {
  const { user, loading, isAuthenticated, isTechnician } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch technician list for assignment dropdowns
  useEffect(() => {
    if (isAuthenticated) {
      api.getTechnicians()
        .then((res) => setTechnicians(res.technicians || []))
        .catch((err) => console.warn('Could not load technicians list:', err));
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight">Initializing HelpDesk 360</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to local SQLite database...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            key={`dash-${refreshTrigger}`}
            onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
          />
        )}

        {activeTab === 'tickets' && (
          isTechnician ? (
            <TechnicianView
              key={`tech-${refreshTrigger}`}
              technicians={technicians}
              onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
            />
          ) : (
            <EmployeeView
              key={`emp-tickets-${refreshTrigger}`}
              initialTab="tickets"
              onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
            />
          )
        )}

        {activeTab === 'create' && (
          <EmployeeView
            key={`emp-create-${refreshTrigger}`}
            initialTab="create"
            onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
          />
        )}
      </main>

      {/* Ticket Details & History Modal */}
      <TicketDetailsModal
        ticketId={selectedTicketId}
        isOpen={!!selectedTicketId}
        technicians={technicians}
        onClose={() => setSelectedTicketId(null)}
        onTicketUpdated={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">HelpDesk 360</span>
            <span>•</span>
            <span>Enterprise IT Incident Management</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Logged in as: <strong className="text-slate-700">{user?.full_name}</strong> ({user?.role})</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              SQLite Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
