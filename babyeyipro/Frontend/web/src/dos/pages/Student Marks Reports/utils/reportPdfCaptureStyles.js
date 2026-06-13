/** Injected on the off-screen clone so html2canvas matches the on-screen report layout. */
export const REPORT_PDF_CAPTURE_CSS = `
[data-report-pdf-clone] {
  overflow: visible !important;
}
[data-report-pdf-clone] .report-no-print {
  display: none !important;
}
[data-report-pdf-clone] [data-report-qr] {
  display: block !important;
  visibility: visible !important;
}
[data-report-pdf-clone] [data-report-profile-row] {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  gap: 1rem !important;
  padding-bottom: 1rem !important;
}
[data-report-pdf-clone] [data-report-summary-cards] {
  width: 52% !important;
  max-width: 52% !important;
  flex-shrink: 0 !important;
}
[data-report-pdf-clone] [data-report-student-photo] {
  width: 88px !important;
  height: 88px !important;
  min-width: 88px !important;
  min-height: 88px !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  border: 2px solid #cbd5e1 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
  background: #ffffff !important;
}
[data-report-pdf-clone] [data-report-student-photo] img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}
[data-report-pdf-clone] [data-report-stat-card] {
  min-height: 58px !important;
  padding: 5px 4px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  background: linear-gradient(to bottom, #ffffff, #f8fafc) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
}
[data-report-pdf-clone] [data-report-stat-card] p {
  overflow: visible !important;
  text-overflow: unset !important;
  white-space: normal !important;
  line-height: 1.2 !important;
}
[data-report-pdf-clone] [data-report-subjects-section] {
  overflow: visible !important;
}
[data-report-pdf-clone] [data-report-table-wrap] {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
}
[data-report-pdf-clone] [data-report-subjects-table] {
  min-width: 0 !important;
  width: 100% !important;
  font-size: 8.5px !important;
  border-collapse: collapse !important;
}
[data-report-pdf-clone] [data-report-th-fixed],
[data-report-pdf-clone] [data-report-th-assessment] {
  background-color: #1e293b !important;
  color: #ffffff !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  padding: 5px 4px !important;
  font-weight: 700 !important;
  font-size: 9px !important;
  vertical-align: middle !important;
}
[data-report-pdf-clone] [data-report-th-sub] {
  color: #cbd5e1 !important;
  font-size: 8px !important;
  font-weight: 500 !important;
  display: block !important;
}
[data-report-pdf-clone] [data-report-subjects-table] tbody tr:nth-child(odd) {
  background-color: #ffffff !important;
}
[data-report-pdf-clone] [data-report-subjects-table] tbody tr:nth-child(even) {
  background-color: #f8fafc !important;
}
[data-report-pdf-clone] [data-report-subjects-table] th,
[data-report-pdf-clone] [data-report-subjects-table] td {
  padding: 4px 5px !important;
  border-bottom: 1px solid #f1f5f9 !important;
}
[data-report-pdf-clone] [data-report-trend-chart] {
  display: block !important;
  min-height: 130px !important;
}
[data-report-pdf-clone] [data-report-grand-total] {
  background-color: #e2e8f0 !important;
  border-top: 2px solid #94a3b8 !important;
  font-weight: 700 !important;
}
[data-report-pdf-clone] [data-report-bottom-panels] {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 0.75rem !important;
  padding-top: 0.5rem !important;
}
[data-report-pdf-clone] [data-report-signatures] {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 1.5rem !important;
  padding-top: 0.75rem !important;
}
[data-report-pdf-clone] .space-y-6 > * + * {
  margin-top: 0.75rem !important;
}
[data-report-pdf-clone] header {
  padding: 0.75rem 1rem !important;
}
[data-report-pdf-clone] [data-report-many-subjects] [data-report-subjects-table] {
  font-size: 7px !important;
}
[data-report-pdf-clone] [data-report-many-subjects] .space-y-6 > * + * {
  margin-top: 0.5rem !important;
}
`;
