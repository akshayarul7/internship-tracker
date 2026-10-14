'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApplicationStatus, Application } from '../types';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';

interface ApplicationFormProps {
  onClose: () => void;
  applicationToEdit?: Application;
}

type FormData = Omit<Application, 'id' | 'createdAt'>;

export default function ApplicationForm({ onClose, applicationToEdit }: ApplicationFormProps) {
  const { addApplication, updateApplication } = useStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: applicationToEdit ? {
      companyName: applicationToEdit.companyName,
      role: applicationToEdit.role,
      dateApplied: applicationToEdit.dateApplied,
      status: applicationToEdit.status,
      portalLink: applicationToEdit.portalLink,
      notes: applicationToEdit.notes,
    } : {
      dateApplied: getLocalDateString(),
      status: 'Applied',
    }
  });

  const onSubmit = (data: FormData) => {
    if (applicationToEdit) {
      updateApplication(applicationToEdit.id, data);
    } else {
      addApplication(data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b dark:border-zinc-800">
          <h2 className="text-xl font-semibold">
            {applicationToEdit ? 'Edit Application' : 'Add New Application'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Company Name *</label>
            <input 
              {...register('companyName', { required: true })} 
              className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Google"
            />
            {errors.companyName && <span className="text-xs text-red-500">Required</span>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Role *</label>
            <input 
              {...register('role', { required: true })} 
              className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Software Engineering Intern"
            />
            {errors.role && <span className="text-xs text-red-500">Required</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date Applied *</label>
              <input 
                type="date"
                {...register('dateApplied', { required: true })} 
                className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.dateApplied && <span className="text-xs text-red-500">Required</span>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select 
                {...register('status')} 
                className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Applicant Portal Link</label>
            <input 
              {...register('portalLink')} 
              className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea 
              {...register('notes')} 
              className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Any extra details..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {applicationToEdit ? 'Save Changes' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
