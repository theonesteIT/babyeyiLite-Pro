import {
  FileText,
  FileCheck,
  FileBadge,
  PenLine,
  Stamp,
} from 'lucide-react';
import { resolveUrl } from './helpers';

/** Collect viewable documents from a normalised increase request. */
export function collectRequestDocuments(request) {
  if (!request) return [];
  const docs = [];
  const add = (path, name, title, icon) => {
    const url = resolveUrl(path);
    if (!url) return;
    docs.push({ url, title: name || title, icon, kind: 'school' });
  };

  add(request.parent_rep_doc_path, request.parent_rep_doc_name, 'Parent Representative Document', FileCheck);
  add(request.budget_doc_path, request.budget_doc_name, 'School Budget Document', FileText);
  add(request.approval_letter_path, request.approval_letter_name, 'DEO Approval Letter', FileBadge);
  add(request.rejection_letter_path, request.rejection_letter_name, 'Rejection Letter', FileBadge);

  return docs;
}

/** DEO assets from request (signature, stamp). */
export function collectDeoDocuments(request) {
  if (!request) return [];
  const docs = [];
  const add = (path, name, title, icon) => {
    const url = resolveUrl(path);
    if (!url) return;
    docs.push({ url, title: name || title, icon, kind: 'deo' });
  };
  add(request.deo_signature_path, request.deo_signature_name, 'DEO Signature', PenLine);
  add(request.deo_stamp_path, request.deo_stamp_name, 'DEO Stamp', Stamp);
  return docs;
}

export function requestStatusMeta(status) {
  if (!status) {
    return { label: 'No request filed', className: 'bg-red-50 text-red-800 border-red-200' };
  }
  const s = String(status).toLowerCase();
  const map = {
    approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    nesa_rejected: { label: 'NESA Rejected', className: 'bg-red-50 text-red-800 border-red-200' },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-800 border-red-200' },
    recommended: { label: 'DEO Recommended', className: 'bg-blue-50 text-blue-800 border-blue-200' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  };
  return map[s] || { label: status.replace(/_/g, ' '), className: 'bg-amber-50 text-amber-900 border-amber-200' };
}

export function overLimitPct(totalFee, nesaLimit) {
  const fee = Number(totalFee || 0);
  const limit = Number(nesaLimit || 0);
  if (!limit) return null;
  return (((fee - limit) / limit) * 100).toFixed(1);
}
