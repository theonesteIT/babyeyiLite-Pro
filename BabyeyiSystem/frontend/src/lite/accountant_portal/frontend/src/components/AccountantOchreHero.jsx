import { createRoleOchreHero } from '../../../../shared/components/LiteRoleOchreHero';
import { useAuth } from '../context/AuthContext';

export default createRoleOchreHero(useAuth, 'staff');
