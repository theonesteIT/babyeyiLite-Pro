import React from 'react'
import TichaDeals from './TichaDeals'
import TichaDealDetails from './TichaDealDetails'
import TichaDealPayments from './TichaDealPayments'
import TrackingTichaDeals from './TrackingTichaDeals'

/**
 * Portal-scoped Ticha Deals pages (paths prefixed with `basePath`, e.g. `/dos`).
 * @param {object} opts
 * @param {import('axios').AxiosInstance} opts.api
 * @param {string} opts.basePath
 * @param {string} [opts.shuleAvanceListPath] — SPA subpath after Avance deal submit (default `/shule-avance`; accountants use `/my-shule-avance`).
 * @param {'legacy'|'orange'|'accountant'|'storekeeper'} [opts.dealsHeroVariant] — `orange` = teacher/discipline/DOS; `accountant` = ochre hero band.
 */
export function createStaffTichaDeals({ api, basePath, useStaffUser, shuleAvanceListPath, dealsHeroVariant }) {
  const avancePath = shuleAvanceListPath || '/shule-avance'
  function StaffTichaDeals() {
    const staffUser = typeof useStaffUser === 'function' ? useStaffUser() : null
    return (
      <TichaDeals
        api={api}
        basePath={basePath}
        dealsHeroVariant={dealsHeroVariant || 'orange'}
        staffUser={staffUser}
      />
    )
  }
  function StaffTrackingTichaDeals() {
    return <TrackingTichaDeals api={api} basePath={basePath} />
  }
  function StaffTichaDealPayments() {
    return <TichaDealPayments api={api} basePath={basePath} />
  }
  function StaffTichaDealDetails() {
    const staffUser = useStaffUser()
    return (
      <TichaDealDetails
        api={api}
        basePath={basePath}
        staffUser={staffUser}
        shuleAvanceListPath={avancePath}
      />
    )
  }
  return {
    TichaDeals: StaffTichaDeals,
    TrackingTichaDeals: StaffTrackingTichaDeals,
    TichaDealPayments: StaffTichaDealPayments,
    TichaDealDetails: StaffTichaDealDetails,
  }
}
