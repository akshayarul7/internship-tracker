import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application } from '../types';

interface StoreState {
  applications: Application[];
  isSyncing: boolean;
  addApplication: (app: Omit<Application, 'id' | 'createdAt'>) => void;
  updateApplication: (id: string, app: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  setApplications: (apps: Application[]) => void;
  syncFromDatabase: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      applications: [],
      isSyncing: false,
      setApplications: (applications) => set({ applications }),
      addApplication: (appData) => {
        const newApp: Application = {
          ...appData,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };

        set((state) => ({
          applications: [...state.applications, newApp],
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newApp),
          }).catch((err) => console.error('Failed to save application to SQLite:', err));
        }
      },
      updateApplication: (id, appData) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id ? { ...app, ...appData } : app
          ),
        }));

        if (typeof window !== 'undefined') {
          const updated = get().applications.find((app) => app.id === id);
          if (updated) {
            fetch('/api/applications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            }).catch((err) => console.error('Failed to update application in SQLite:', err));
          }
        }
      },
      deleteApplication: (id) => {
        set((state) => ({
          applications: state.applications.filter((app) => app.id !== id),
        }));

        if (typeof window !== 'undefined') {
          fetch(`/api/applications?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          }).catch((err) => console.error('Failed to delete application from SQLite:', err));
        }
      },
      syncFromDatabase: async () => {
        if (typeof window === 'undefined') return;
        try {
          set({ isSyncing: true });
          const res = await fetch('/api/applications');
          if (!res.ok) throw new Error('API error');
          const data = await res.json();
          if (data.configured === false) return;
          const serverApps: Application[] = data.applications || [];
          const localApps = get().applications;

          if (serverApps.length > 0) {
            // Server has data, update store
            set({ applications: serverApps });
          } else if (localApps.length > 0) {
            // Server is empty, but browser has local data (e.g. from Safari).
            // Migrate local data into Supabase!
            await fetch('/api/applications', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ applications: localApps }),
            });
          }
        } catch (err) {
          console.error('Error syncing applications with SQLite:', err);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'internship-tracker-storage',
    }
  )
);
