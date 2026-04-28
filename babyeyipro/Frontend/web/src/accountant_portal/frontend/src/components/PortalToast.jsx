import React from 'react';

export default function PortalToast({ toast }) {
  if (!toast?.message) return null;
  const isError = String(toast.type || '').toLowerCase() === 'error';
  return (
    <div className="fixed top-4 right-4 z-[400] max-w-sm w-[calc(100%-2rem)] sm:w-auto">
      <div className={`rounded-xl border px-4 py-3 shadow-xl text-[11px] font-black uppercase tracking-wide ${isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
        {toast.message}
      </div>
    </div>
  );
}

