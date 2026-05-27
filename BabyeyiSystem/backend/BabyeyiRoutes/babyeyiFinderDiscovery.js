// Shared JSON for GET discovery on Babyeyi Finder guest pay (no login).
// Used by parentPortal (GET /parent-portal/public/babyeyi-finder) and
// publicBabyeyiPay (GET / on mounted routers).

function getBabyeyiFinderDiscoveryPayload() {
  return {
    service: 'babyeyi_finder_guest_pay',
    description: 'Pricing and payment intents for approved Babyeyi documents. No login.',
    student_lookup: {
      note: 'Step 1 — resolve learner by student UID, official student_code, or SDM ID (sdm_code)',
      method: 'POST',
      paths: [
        '/api/parent-portal/public/babyeyi-finder/student-lookup',
        '/api/public/student-code-lookup',
      ],
      body: {
        code: 'optional string — UID or official student_code',
        student_uid: 'optional alias of code',
        sdm_code: 'optional alias — SDMS / SDM ID',
        sdmCode: 'optional camelCase alias of sdm_code',
      },
      public_page_deep_link:
        'GET /babyeyi-finder?schoolId=…&studentCode=… or &sdmId=… (or sdm_id); schoolId alone skips lookup',
    },
    pricing: {
      note: 'Step 2 — school fees + requirement lines',
      method: 'GET',
      path_template: '/pricing/:babyeyiId?school_code={directoryCode}',
      query: {
        school_code: 'preferred — directory code e.g. 003',
        school_id: 'optional numeric schools.id (legacy)',
      },
    },
    quote_balance: {
      method: 'POST',
      path: '/quote-balance',
      body: {
        school_code: 'preferred',
        school_id: 'optional',
        babyeyi_id: 'required',
        selected_fee_ids: [],
        selected_requirement_ids: [],
        selected_students: [],
      },
    },
    payment_intent: {
      note: 'Step 3 — record payer + MoMo/bank/loan metadata',
      method: 'POST',
      path: '/intent',
    },
    public_pay_by_school: {
      note: 'School code → catalog of class/term/year, then pricing; or student search in one school',
      discovery: 'GET /api/public/public-pay',
      school_catalog: {
        method: 'POST',
        path: '/api/public/public-pay/school-catalog',
        body: { school_code: '003' },
      },
      class_pricing: {
        method: 'POST',
        path: '/api/public/public-pay/class-pricing',
        body: { school_code: '003', class_name: 'P1', academic_year: 'optional', term: 'optional' },
      },
      search_student: {
        method: 'POST',
        path: '/api/public/public-pay/search-student',
        body: { school_code: '003', code: 'UID / student_code / SDM id', babyeyi_id: 'optional' },
      },
      student_catalog: {
        method: 'POST',
        path: '/api/public/public-pay/student-catalog',
        body: { code: 'UID / student_code / SDM id — resolves school + class; Babyeyi rows for that class' },
      },
    },
    check_provider_status: {
      method: 'POST',
      path_template: '/intent/:id/check-provider-status',
    },
  };
}

module.exports = { getBabyeyiFinderDiscoveryPayload };
