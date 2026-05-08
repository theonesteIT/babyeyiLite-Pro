import React from 'react';
import { Wallet } from 'lucide-react';
import SharedStaffPayroll from '../../shared/pages/StaffPayroll';
import api from '../services/api';
import DosOchreHero from '../components/DosOchreHero';

export default function StaffPayroll() {
  return (
    <>
      <DosOchreHero
        eyebrow="Compensation"
        titleLine="My"
        titleAccent="payroll"
        subtitle="View your salary summary, payment history, and pending requests in one place."
        icon={Wallet}
      />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10">
        <SharedStaffPayroll apiClient={api} endpoint="/staff/payroll/my" layout="embedded" />
      </div>
    </>
  );
}
