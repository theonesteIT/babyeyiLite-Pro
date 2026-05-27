import BudgetPushBanner from './BudgetPushBanner';

/** Enable web push for action plan & activity deadline alerts (uses portal push API). */
export default function ActionPlanPushBanner({ api, className = '' }) {
  return (
    <BudgetPushBanner
      api={api}
      className={className}
      label="Action plan alerts"
      enabledMessage="You will receive action plan and deadline reminders on this device"
    />
  );
}
