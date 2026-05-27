import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, UserX, UserCheck, Trash2 } from "lucide-react";

const MENU_WIDTH = 188;

export default function StaffActionsMenu({ anchorRect, row, onView, onEdit, onToggleActive, onDelete, onClose }) {
  const isActive = Number(row.is_active) === 1;
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRect) return;
    const pad = 8;
    let top = anchorRect.bottom + 4;
    let left = anchorRect.right - MENU_WIDTH;

    if (left < pad) left = pad;
    if (left + MENU_WIDTH > window.innerWidth - pad) {
      left = window.innerWidth - MENU_WIDTH - pad;
    }
    if (top + 220 > window.innerHeight - pad) {
      top = Math.max(pad, anchorRect.top - 220);
    }

    setPos({ top, left });
  }, [anchorRect]);

  if (!anchorRect) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[8000]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed z-[8001] min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-sm overflow-hidden"
        style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2.5 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
          onClick={() => { onClose(); onView(row); }}
        >
          <Eye size={15} className="text-slate-400" /> View
        </button>
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2.5 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
          onClick={() => { onClose(); onEdit(row); }}
        >
          <Pencil size={15} className="text-amber-600" /> Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2.5 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
          onClick={() => { onClose(); onToggleActive(row); }}
        >
          {isActive ? (
            <><UserX size={15} className="text-orange-500" /> Deactivate</>
          ) : (
            <><UserCheck size={15} className="text-emerald-600" /> Activate</>
          )}
        </button>
        <div className="border-t border-slate-100 my-1" />
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2.5 text-left hover:bg-red-50 font-medium text-red-600 flex items-center gap-2"
          onClick={() => { onClose(); onDelete(row); }}
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </>,
    document.body
  );
}
