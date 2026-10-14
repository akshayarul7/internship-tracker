'use client';

import { useState, useEffect } from 'react';
import { Application } from '../types';
import DashboardStats from '../components/DashboardStats';
import ApplicationList from '../components/ApplicationList';
import ApplicationForm from '../components/ApplicationForm';
import { Plus, Download } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Home() {
  const { applications } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);

  const handleExportCSV = () => {
    if (applications.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ['Company Name', 'Role', 'Date Applied', 'Status', 'Portal Link', 'Notes'];
    const csvRows = [headers.join(',')];

    for (const app of applications) {
      const values = [
        `"${app.companyName.replace(/"/g, '""')}"`,
        `"${app.role.replace(/"/g, '""')}"`,
        `"${app.dateApplied}"`,
        `"${app.status}"`,
        `"${app.portalLink || ''}"`,
        `"${(app.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `internship_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prevent hydration errors with Zustand persist
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingApp(undefined);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Internship Tracker</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Manage and track all your internship applications in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium shadow-sm"
              title="Export to CSV"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus size={20} />
              Add Application
            </button>
          </div>
        </header>

        <main>
          <DashboardStats />
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Applications</h2>
          </div>
          
          <ApplicationList onEdit={handleEdit} />
        </main>

      </div>

      {isFormOpen && (
        <ApplicationForm 
          onClose={handleCloseForm} 
          applicationToEdit={editingApp} 
        />
      )}
    </div>
  );
}
