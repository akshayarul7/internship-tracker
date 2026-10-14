import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application } from '../types';

interface StoreState {
  applications: Application[];
  addApplication: (app: Omit<Application, 'id' | 'createdAt'>) => void;
  updateApplication: (id: string, app: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      applications: [],
      addApplication: (appData) => set((state) => ({
        applications: [
          ...state.applications,
          {
            ...appData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
          }
        ]
      })),
      updateApplication: (id, appData) => set((state) => ({
        applications: state.applications.map((app) => 
          app.id === id ? { ...app, ...appData } : app
        )
      })),
      deleteApplication: (id) => set((state) => ({
        applications: state.applications.filter((app) => app.id !== id)
      })),
    }),
    {
      name: 'internship-tracker-storage',
    }
  )
);
