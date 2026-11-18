import { useCallback, useEffect, useState } from 'react';

/** Tiny toast: `show('copied!')` and it fades out after a couple of seconds. */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const show = useCallback((text: string) => setToast({ text, id: Date.now() }), []);

  const element = (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          {toast.text}
        </div>
      )}
    </div>
  );

  return { show, element };
}
