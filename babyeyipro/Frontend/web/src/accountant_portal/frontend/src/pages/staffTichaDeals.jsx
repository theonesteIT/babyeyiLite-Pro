import { createStaffTichaDeals } from '../../../../shared/staffTichaDeals/createStaffTichaDeals'
import { useAuth } from '../context/AuthContext'
import { PORTAL } from '../config/portal'
import accountantApi from '../services/api'

export const { TichaDeals, TichaDealDetails, TichaDealPayments, TrackingTichaDeals } = createStaffTichaDeals({
  api: accountantApi,
  basePath: PORTAL.basePath,
  useStaffUser: () => useAuth().staff,
  shuleAvanceListPath: '/my-shule-avance',
})
