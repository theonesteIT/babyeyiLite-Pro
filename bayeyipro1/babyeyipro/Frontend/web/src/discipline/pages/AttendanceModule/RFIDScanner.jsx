import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';

export default function RFIDScanner({ title, onSimulate, entityLabel = 'ID' }) {
  const [entityId, setEntityId] = useState('');
  const [direction, setDirection] = useState('IN');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!entityId) return;
    setBusy(true);
    try {
      await onSimulate?.({ entityId, direction });
      setEntityId('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ScanLine size={16} className="text-re-orange" />
        <h4 className="text-xs font-black uppercase tracking-widest">{title}</h4>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder={`Enter ${entityLabel}`}
          className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold"
        />
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="h-10 rounded-xl border border-black/10 px-3 text-xs font-semibold"
        >
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !entityId}
          className="h-10 rounded-xl bg-re-grad-orange px-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
        >
          {busy ? 'Scanning...' : 'Simulate Scan'}
        </button>
      </div>
    </div>
  );
}
