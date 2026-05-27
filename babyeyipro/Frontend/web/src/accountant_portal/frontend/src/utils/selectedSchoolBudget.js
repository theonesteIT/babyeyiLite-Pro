const STORAGE_KEY = 'babyeyi_accountant_selected_budget_id';

export function getSelectedBudgetId() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setSelectedBudgetId(id) {
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, String(id));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
