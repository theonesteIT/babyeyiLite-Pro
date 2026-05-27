const KEY = 'babyeyi_selected_action_plan_id';

export function getSelectedActionPlanId() {
  try {
    const id = Number(sessionStorage.getItem(KEY));
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setSelectedActionPlanId(id) {
  try {
    if (id) sessionStorage.setItem(KEY, String(id));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
