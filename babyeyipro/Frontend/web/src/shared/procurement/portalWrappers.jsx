import { useAuth as useTeacherAuth } from '../../teacher/context/AuthContext';
import { useAuth as useDisciplineAuth } from '../../discipline/context/AuthContext';
import { useAuth as useStoreAuth } from '../../storekeeper_portal/frontend/src/context/AuthContext';
import { useAuth as useAssetsAuth } from '../../assets_portal/context/AuthContext';
import { useAuth as useLibrarianAuth } from '../../librarian_portal/frontend/src/context/AuthContext';
import { useAuth as useDosAuth } from '../../dos/context/AuthContext';
import { useAuth as useAccountantAuth } from '../../accountant_portal/frontend/src/context/AuthContext';
import { useAuth as useManagerAuth } from '../../manager/context/AuthContext';
import { useAuth as useRepresentativeAuth } from '../../Representative/context/AuthContext';
import { useMasterAuth } from '../../context/MasterAuthContext';
import RequestOrder from './RequestOrder';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import AccountantOchreHero from '../../accountant_portal/frontend/src/components/AccountantOchreHero';
import DosOchreHero from '../../dos/components/DosOchreHero';
import { ShoppingCart } from 'lucide-react';

function resolveName(user) {
  if (!user) return '';
  return user.full_name || user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username || user.email || '';
}

export function TeacherRequestOrder() {
  const { teacher } = useTeacherAuth();
  return (
    <RequestOrder
      portalSource="teacher"
      userName={resolveName(teacher)}
      HeroComponent={TeacherOrangeHero}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Submit item requests for accountant review and approval.',
        icon: ShoppingCart,
      }}
    />
  );
}

export function DisciplineRequestOrder() {
  const { teacher } = useDisciplineAuth();
  return (
    <RequestOrder
      portalSource="discipline"
      userName={resolveName(teacher)}
      HeroComponent={TeacherOrangeHero}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Request supplies and equipment for discipline operations.',
        icon: ShoppingCart,
      }}
    />
  );
}

export function DosRequestOrder() {
  const { teacher } = useDosAuth();
  return (
    <RequestOrder
      portalSource="dos"
      userName={resolveName(teacher)}
      HeroComponent={DosOchreHero}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Submit departmental procurement requests.',
        icon: ShoppingCart,
      }}
    />
  );
}

export function StorekeeperRequestOrder() {
  const { staff } = useStoreAuth();
  return (
    <RequestOrder
      portalSource="storekeeper"
      userName={resolveName(staff)}
      heroProps={{}}
    />
  );
}

export function AssetsRequestOrder() {
  const { staff } = useAssetsAuth();
  return (
    <RequestOrder
      portalSource="assets"
      userName={resolveName(staff)}
      heroProps={{}}
    />
  );
}

export function LibrarianRequestOrder() {
  const { staff } = useLibrarianAuth();
  return (
    <RequestOrder
      portalSource="librarian"
      userName={resolveName(staff)}
      heroProps={{}}
    />
  );
}

export function AccountantRequestOrder() {
  const { staff } = useAccountantAuth();
  return (
    <RequestOrder
      portalSource="accountant"
      requestScope="school"
      userName={resolveName(staff)}
      HeroComponent={AccountantOchreHero}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'View all school purchase requests, submit your own, and forward to requisitions.',
        icon: ShoppingCart,
      }}
    />
  );
}

export function ManagerRequestOrder() {
  const { manager } = useManagerAuth();
  return (
    <RequestOrder
      portalSource="manager"
      requestScope="school"
      userName={resolveName(manager)}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Review all staff purchase requests across the school.',
      }}
    />
  );
}

export function RepresentativeRequestOrder() {
  const { manager } = useRepresentativeAuth();
  return (
    <RequestOrder
      portalSource="representative"
      requestScope="school"
      userName={resolveName(manager)}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Submit procurement requests for the selected school.',
      }}
    />
  );
}

export function GateKeeperRequestOrder() {
  const { user } = useMasterAuth();
  return (
    <RequestOrder
      portalSource="gatekeeper"
      userName={resolveName(user)}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Request supplies and equipment for gate operations.',
      }}
    />
  );
}
