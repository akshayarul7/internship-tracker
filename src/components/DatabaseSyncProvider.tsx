'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';

export default function DatabaseSyncProvider({ children }: { children: React.ReactNode }) {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    // Initial sync from SQLite
    const syncAll = async () => {
      try {
        await Promise.all([
          useStore.getState().syncFromDatabase(),
          useNeetcodeStore.getState().syncFromDatabase(),
        ]);
        setIsSynced(true);
      } catch (err) {
        console.error('Failed to sync with SQLite:', err);
      }
    };

    syncAll();

    // Whenever user focuses or switches tabs back to this browser, re-sync from SQLite
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    };

    window.addEventListener('focus', syncAll);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncAll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {children}
    </>
  );
}
