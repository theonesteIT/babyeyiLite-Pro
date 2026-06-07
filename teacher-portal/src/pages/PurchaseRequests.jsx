import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RequestOrder from '../procurement/RequestOrder';
import TeacherOrangeHero from '../components/TeacherOrangeHero';

function resolveName(user) {
  if (!user) return '';
  return user.full_name || user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username || user.email || '';
}

function TeacherHeroAdapter(props) {
  return (
    <TeacherOrangeHero
      title={`${props.titleLine || 'Purchase'} ${props.titleAccent || 'Requests'}`}
      subtitle={props.subtitle || 'Submit item requests for accountant review and approval.'}
      badgeLabel={props.eyebrow || 'Procurement'}
    />
  );
}

export default function PurchaseRequests() {
  const { teacher } = useAuth();

  return (
    <RequestOrder
      portalSource="teacher"
      userName={resolveName(teacher)}
      HeroComponent={TeacherHeroAdapter}
      heroProps={{
        eyebrow: 'Procurement',
        titleLine: 'Purchase',
        titleAccent: 'Requests',
        subtitle: 'Submit procurement requests for your school. Track status until a purchase order is issued.',
        icon: ShoppingCart,
      }}
    />
  );
}
