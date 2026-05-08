import React from 'react';
import SharedStaffPayroll from '../../shared/pages/StaffPayroll';
import api from '../services/api';

export default function StaffPayroll() {
  return <SharedStaffPayroll apiClient={api} endpoint="/staff/payroll/my" />;
}

