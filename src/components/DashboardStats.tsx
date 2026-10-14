'use client';

import { useStore } from '../store/useStore';
import { Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardStats() {
  const { applications } = useStore();

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'Applied').length,
    interviewing: applications.filter(a => a.status === 'Interviewing').length,
    offered: applications.filter(a => a.status === 'Offered').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
          <Briefcase size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Applications</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Applied / In Progress</p>
          <p className="text-2xl font-bold">{stats.applied + stats.interviewing}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Offers Received</p>
          <p className="text-2xl font-bold">{stats.offered}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
          <XCircle size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Rejections</p>
          <p className="text-2xl font-bold">{stats.rejected}</p>
        </div>
      </div>
    </div>
  );
}
