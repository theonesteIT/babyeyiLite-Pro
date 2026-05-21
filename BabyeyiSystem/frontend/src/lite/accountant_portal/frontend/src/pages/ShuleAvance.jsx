import React from 'react';
import { Wallet } from 'lucide-react';
import AccountantOchreHero from '../components/AccountantOchreHero';
import ShuleAvanceFinanceApprovals from '../components/ShuleAvanceFinanceApprovals';

export default function ShuleAvance() {
  return (
    <div className="min-h-full bg-re-bg animate-in fade-in duration-500">
      <AccountantOchreHero
        eyebrow="Staff services · Finance"
        titleLine="Shule"
        titleAccent="Avance"
        subtitle="Review teacher advance requests and route them to the school manager for approval"
        icon={Wallet}
      />
      <div className="acct-shell-standard pb-16">
        <div className="acct-panel-sheet p-4 sm:p-6 md:p-8">
          <ShuleAvanceFinanceApprovals />
        </div>
      </div>
    </div>
  );
}
