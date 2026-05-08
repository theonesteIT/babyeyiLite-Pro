import { Wallet } from 'lucide-react';
import SharedStaffPayroll from '../../../../shared/pages/StaffPayroll';
import StorekeeperOchreHero from '../components/StorekeeperOchreHero';
import api from '../services/api';

export default function StaffPayroll() {
  return (
    <div className="animate-in fade-in bg-re-bg min-h-full pb-24 lg:pb-10">
      <StorekeeperOchreHero
        eyebrow="Compensation"
        titleLine="My"
        titleAccent="Payroll"
        subtitle="Net salary, payments history & advance balance"
        icon={Wallet}
      />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 pb-16">
        <div className="rounded-t-[32px] bg-white border border-black/10 shadow-sm p-4 sm:p-6">
          <SharedStaffPayroll apiClient={api} layout="embedded" />
        </div>
      </div>
    </div>
  );
}
