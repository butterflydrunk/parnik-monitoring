import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => {
      // Confirm with a quick HEAD fetch to make sure actual connection works
      fetch('/api/records', { method: 'HEAD' })
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      fetch('/api/records', { method: 'HEAD' })
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
