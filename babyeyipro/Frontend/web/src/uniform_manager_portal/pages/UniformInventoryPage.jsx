import { useSearchParams } from 'react-router-dom'
import { Settings as SettingsIcon, Bell, Shield } from 'lucide-react'
import UniformInventory from '../../storekeeper_portal/frontend/src/pages/UniformInventory'
import {
  UniformPageLayout,
  HrPanel,
  HrPanelHeader,
  HrAlert,
} from '../components/uniformUi'

const TAB_IDS = new Set([
  'dashboard', 'fabric-in', 'fabric-out', 'fabric-stock', 'fabric-planner',
  'finished-goods', 'issue', 'sales',
])

export default function UniformInventoryPage() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  const initialTab = tab && TAB_IDS.has(tab) ? tab : 'dashboard'

  return <UniformInventory initialTab={initialTab} hrLayout />
}

export function SettingsPage() {
  return (
    <UniformPageLayout
      eyebrow="Uniform Manager"
      title="Portal Settings"
      subtitle="Preferences and notification options"
      HeroIcon={SettingsIcon}
      showOverlap={false}
    >
      <HrPanel>
        <HrPanelHeader title="General" description="Managed by your school administrator" />
        <div className="p-5 space-y-4">
          <HrAlert variant="info" title="School-managed settings" icon={Shield}>
            Portal settings are managed by your school administrator. Contact them to update
            uniform policies, academic calendar links, or notification preferences.
          </HrAlert>
        </div>
      </HrPanel>

      <HrPanel>
        <HrPanelHeader title="Notifications" description="Alerts & reminders" />
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-slate-50/50 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEBF10]/15 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-[#c87800]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>Low stock alerts</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                When finished uniform stock falls below the school threshold, alerts appear on your dashboard
                and in the inventory workspace.
              </p>
            </div>
          </div>
        </div>
      </HrPanel>
    </UniformPageLayout>
  )
}
