import { useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(kind, message) {
    setToast({ kind, message });
  }

  return { showToast, toast, clearToast: () => setToast(null) };
}
