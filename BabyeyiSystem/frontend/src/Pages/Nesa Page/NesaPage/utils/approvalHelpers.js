import { FileCheck, FileText, FileBadge, PenLine, Stamp } from 'lucide-react';
import { resolveUrl } from './helpers';

export function getApprovalDocuments(r) {
  const docs = [];
  const add = (path, name, title, icon) => {
    if (path) docs.push({ url: resolveUrl(path), title: name || title, icon });
  };
  add(r.parent_rep_doc_path, r.parent_rep_doc_name, 'Parent Representative Document', FileCheck);
  add(r.budget_doc_path, r.budget_doc_name, 'School Budget Document', FileText);
  add(r.approval_letter_path, r.approval_letter_name, 'DEO Approval Letter', FileBadge);
  add(r.deo_signature_path, r.deo_signature_name, 'DEO Signature', PenLine);
  add(r.deo_stamp_path, r.deo_stamp_name, 'DEO Stamp', Stamp);
  return docs;
}

export function isPendingApproval(r) {
  return r.nesa_status === 'pending' || r.nesa_status === 'recommended';
}

export const STATUS_FILTERS = [
  { id: 'pending', label: 'Needs action' },
  { id: 'recommended', label: 'DEO recommended' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s === 'recommended') return 'bg-blue-50 text-blue-800 border-blue-200';
  if (s === 'pending') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (s === 'rejected' || s === 'nesa_rejected') return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}
