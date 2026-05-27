import api from './api';



function err(e, fallback) {

  return e?.response?.data?.message || e?.message || fallback;

}



export async function fetchFeeReminderOptions() {

  const res = await api.get('/accountant/fee-reminders/options');

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load options');

  return res.data.data;

}



export async function fetchFeeReminderStudents(params) {

  const res = await api.get('/accountant/fee-reminders/students', { params });

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load students');

  return res.data.data;

}



export async function fetchFeeReminderRecipientPreview(params) {

  const res = await api.get('/accountant/fee-reminders/recipient-preview', { params });

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load preview');

  return res.data.data;

}



export async function fetchFeeReminderCampaigns() {

  const res = await api.get('/accountant/fee-reminders/campaigns');

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load campaigns');

  return res.data.data || [];

}



export async function fetchFeeReminderCampaignDetail(id) {

  const res = await api.get(`/accountant/fee-reminders/campaigns/${id}`);

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load campaign details');

  return res.data.data;

}



export async function createFeeReminderCampaign(payload) {

  try {

    const res = await api.post('/accountant/fee-reminders/campaigns', payload);

    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to send campaign');

    return res.data.data;

  } catch (e) {

    throw new Error(err(e, 'Failed to send campaign'));

  }

}



export async function fetchFeeReminderRules() {

  const res = await api.get('/accountant/fee-reminders/rules');

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load rules');

  return res.data.data || [];

}



export async function fetchFeeReminderConditionExamples() {

  const res = await api.get('/accountant/fee-reminders/rules/condition-examples');

  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load examples');

  return res.data.data;

}



export async function previewFeeReminderRuleMatch(payload) {
  try {
    const res = await api.post('/accountant/fee-reminders/rules/preview-match', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to preview match');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to preview match'));
  }
}

export async function runFeeReminderRuleNow(id) {

  try {

    const res = await api.post(`/accountant/fee-reminders/rules/${id}/run-now`);

    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to run rule');

    return res.data;

  } catch (e) {

    throw new Error(err(e, 'Failed to run rule'));

  }

}



export async function createFeeReminderRule(payload) {

  try {

    const res = await api.post('/accountant/fee-reminders/rules', payload);

    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create rule');

    return res.data.data;

  } catch (e) {

    throw new Error(err(e, 'Failed to create rule'));

  }

}



export async function updateFeeReminderRule(id, payload) {

  try {

    const res = await api.patch(`/accountant/fee-reminders/rules/${id}`, payload);

    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update rule');

    return res.data.data;

  } catch (e) {

    throw new Error(err(e, 'Failed to update rule'));

  }

}



export async function deleteFeeReminderRule(id) {

  try {

    const res = await api.delete(`/accountant/fee-reminders/rules/${id}`);

    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete rule');

    return res.data;

  } catch (e) {

    throw new Error(err(e, 'Failed to delete rule'));

  }

}



/** Map API student row → UI table / modal shape */

export function mapStudentForUi(row) {

  return {

    id: row.id,

    student_id: row.student_id,

    student_code: row.student_code || row.id,

    name: row.name,

    class: row.class_name,

    balance: row.balance == null ? null : Number(row.balance || 0),
    report_status: row.report_status || null,

    status: row.status,

    parent: row.parent_name,

    email: row.parent_email || '',

    phone: row.parent_phone || '',

    has_email: !!row.has_email,

    has_push: !!row.has_push,

    overdue: Number(row.overdue_days || 0),

  };

}



export function formatBalanceRwf(amount) {

  return Number(amount || 0).toLocaleString('en-US');

}



export function filterCampaignRecipients(students, recipients) {

  const hasBucket =

    recipients.notPaid || recipients.partial || recipients.overdue || recipients.smallBalance;

  if (!hasBucket) return [];



  let list = students.filter((x) => {

    if (recipients.notPaid && x.status === 'unpaid') return true;

    if (recipients.partial && x.status === 'partial') return true;

    if (recipients.overdue && x.overdue > 7) return true;

    if (recipients.smallBalance && x.balance != null && x.balance > 0 && x.balance < 50000) return true;

    return false;

  });

  const className = String(recipients.className || '').trim();
  if (className && className !== 'All') {
    list = list.filter((x) => String(x.class || '') === className);
  }

  const q = String(recipients.search || '').trim().toLowerCase();

  if (q) {

    list = list.filter(

      (x) =>

        x.name.toLowerCase().includes(q) ||

        String(x.id || '').toLowerCase().includes(q) ||

        String(x.student_code || '').toLowerCase().includes(q)

    );

  }

  return list;

}

export function computeBucketCounts(students, className = 'All') {
  let list = students;
  if (className && className !== 'All') {
    list = list.filter((s) => String(s.class || '') === className);
  }
  return {
    not_paid: list.filter((s) => s.status === 'unpaid').length,
    partial: list.filter((s) => s.status === 'partial').length,
    overdue: list.filter((s) => s.overdue > 7).length,
    small_balance: list.filter((s) => s.balance != null && s.balance > 0 && s.balance < 50000).length,
  };
}



export function computeCampaignChannelStats(matching) {

  const emails = matching.filter((s) => s.has_email || s.email).length;

  const push = matching.filter((s) => s.has_push).length;

  const inSystem = matching.filter((s) => s.phone).length;

  const parents = new Set(matching.map((s) => s.phone).filter(Boolean)).size;

  return {

    parents_selected: parents || matching.length,

    emails_ready: emails,

    push_ready: push,

    in_system_ready: inSystem,

  };

}


