import { createStaffTichaDeals } from '../../../../shared/staffTichaDeals/createStaffTichaDeals'
import { useAuth } from '../context/AuthContext'
import { PORTAL } from '../config/portal'
import librarianApi from '../services/api'

export const { TichaDeals, TichaDealDetails, TichaDealPayments, TrackingTichaDeals } = createStaffTichaDeals({
  api: librarianApi,
  basePath: PORTAL.basePath,
  useStaffUser: () => useAuth().staff,
})
