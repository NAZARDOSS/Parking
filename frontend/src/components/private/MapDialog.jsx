import { useEffect, useRef } from 'react';
import { Icon } from "@iconify/react";

function MapDialog({ open, handleClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      timerRef.current = setTimeout(handleClose, 6000);
    }
    return () => clearTimeout(timerRef.current);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div className="absolute bottom-6 right-24 z-50 flex max-w-xs items-start gap-3 rounded-lg border border-amber-300/30 bg-[#031A3A]/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
      <Icon icon="mdi:alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
      <span className="text-sm leading-snug">
        Please enable location services in your browser settings
      </span>
      <button
        type="button"
        onClick={handleClose}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-white"
        aria-label="Close notification"
      >
        <Icon icon="mdi:close" className="h-4 w-4" />
      </button>
    </div>
  );
}

export default MapDialog;
