import { createStaffTichaDeals } from '../../../../shared/staffTichaDeals/createStaffTichaDeals'
import { useAuth } from '../context/AuthContext'
import { PORTAL } from '../config/portal'
import storekeeperApi from '../services/api'

export const { TichaDeals, TichaDealDetails, TichaDealPayments, TrackingTichaDeals } = createStaffTichaDeals({
  api: storekeeperApi,
  basePath: PORTAL.basePath,
  useStaffUser: () => useAuth().staff,
  dealsHeroVariant: 'storekeeper',
})
