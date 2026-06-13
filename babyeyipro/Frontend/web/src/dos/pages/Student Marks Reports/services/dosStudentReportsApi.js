import api from '../../../services/api';

export async function fetchReportsDashboard(params = {}) {
  const res = await api.get('/dos/student-reports/dashboard', { params });
  return res.data;
}

export async function fetchReportsAnalytics(params = {}) {
  const res = await api.get('/dos/student-reports/analytics', { params });
  return res.data;
}

export async function fetchReportPreview(params) {
  const res = await api.get('/dos/student-reports/preview', { params });
  return res.data;
}

export async function generateReports(payload) {
  const res = await api.post('/dos/student-reports/generate', payload);
  return res.data;
}

export async function fetchAnnualReportPreview(params) {
  const res = await api.get('/dos/student-reports/annual/preview', { params });
  return res.data;
}

export async function generateAnnualReports(payload) {
  const res = await api.post('/dos/student-reports/annual/generate', payload);
  return res.data;
}

/** Seed P5 demo assignments, marks for all terms, and generate mid-term + final reports */
export async function seedDemoMarksReports(payload = {}) {
  const res = await api.post('/dos/student-reports/seed-demo', payload);
  return res.data;
}

export async function fetchReportSnapshot(snapshotId) {
  const res = await api.get(`/dos/student-reports/snapshots/${snapshotId}`);
  return res.data;
}

export async function publishBatch(batchId) {
  const res = await api.post(`/dos/student-reports/batches/${batchId}/publish`);
  return res.data;
}

export async function publishSnapshot(snapshotId) {
  const res = await api.patch(`/dos/student-reports/snapshots/${snapshotId}/publish`);
  return res.data;
}

export async function updateReportComments(snapshotId, payload) {
  const res = await api.patch(`/dos/student-reports/snapshots/${snapshotId}/comments`, payload);
  return res.data;
}

export async function fetchReportBatches() {
  const res = await api.get('/dos/student-reports/batches');
  return res.data;
}

export function reportPdfUrl(snapshotId) {
  const base = api.defaults.baseURL || '/api';
  return `${base}/dos/student-reports/snapshots/${snapshotId}/pdf`;
}

export function batchZipUrl(batchId) {
  const base = api.defaults.baseURL || '/api';
  return `${base}/dos/student-reports/batches/${batchId}/zip`;
}

async function blobErrorMessage(blob, fallback = 'Download failed') {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    return json.message || fallback;
  } catch (_) {
    return fallback;
  }
}

/** Authenticated ZIP download (session cookie via axios). */
export async function downloadBatchZip(batchId, filename) {
  try {
    const res = await api.get(`/dos/student-reports/batches/${batchId}/zip`, {
      responseType: 'blob',
      timeout: 300000,
    });
    const contentType = String(res.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      throw new Error(await blobErrorMessage(res.data, 'Failed to download ZIP'));
    }
    const safeName = (filename || `reports-batch-${batchId}.zip`).replace(/[^\w.-]+/g, '_');
    const blob = new Blob([res.data], { type: 'application/zip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeName;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      throw new Error(await blobErrorMessage(err.response.data, 'Failed to download ZIP'));
    }
    throw err;
  }
}
