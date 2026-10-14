'use client';

import { useStore } from '../store/useStore';
import { Application } from '../types';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';

interface ApplicationListProps {
  onEdit: (app: Application) => void;
}

const statusColors = {
  Applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Interviewing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Offered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function ApplicationList({ onEdit }: ApplicationListProps) {
  const { applications, deleteApplication } = useStore();

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed dark:border-zinc-800">
        <p className="text-zinc-500">No applications added yet. Start tracking your internships!</p>
      </div>
    );
  }

  // Sort by date applied (newest first)
  const sortedApps = [...applications].sort((a, b) => 
    new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b dark:border-zinc-800">
              <th className="px-6 py-4 font-medium text-sm text-zinc-500 dark:text-zinc-400">Company</th>
              <th className="px-6 py-4 font-medium text-sm text-zinc-500 dark:text-zinc-400">Role</th>
              <th className="px-6 py-4 font-medium text-sm text-zinc-500 dark:text-zinc-400">Date Applied</th>
              <th className="px-6 py-4 font-medium text-sm text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-6 py-4 font-medium text-sm text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {sortedApps.map((app) => (
              <tr key={app.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium">
                  <div className="flex items-center gap-2">
                    {app.companyName}
                    {app.portalLink && (
                      <a 
                        href={app.portalLink.startsWith('http') ? app.portalLink : `https://${app.portalLink}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        title="Applicant Portal"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{app.role}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                  {(() => {
                    const [year, month, day] = app.dateApplied.split('-');
                    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
                    return localDate.toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric'
                    });
                  })()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[app.status]}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => onEdit(app)}
                    className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this application?')) {
                        deleteApplication(app.id);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
