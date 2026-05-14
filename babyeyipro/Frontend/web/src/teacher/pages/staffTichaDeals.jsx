import { createStaffTichaDeals } from '../../shared/staffTichaDeals/createStaffTichaDeals'
import api from '../services/api'
import { PORTAL } from '../config/portal'
import { useAuth } from '../context/AuthContext'

export const { TichaDeals, TichaDealDetails, TichaDealPayments, TrackingTichaDeals } = createStaffTichaDeals({
  api,
  basePath: PORTAL.basePath,
  useStaffUser: () => useAuth().teacher,
})
