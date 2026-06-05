import api from './api'

export const DEFAULT_FOOD_ALERT_SETTINGS = {
  low_stock_enabled: true,
  expiry_alerts_enabled: true,
  expiry_alert_days: 14,
}

export async function fetchFoodAlertSettings() {
  const res = await api.get('/store/food-alert-settings')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load alert settings')
  return { ...DEFAULT_FOOD_ALERT_SETTINGS, ...(res.data.data || {}) }
}

export async function updateFoodAlertSettings(settings) {
  const res = await api.patch('/store/food-alert-settings', settings)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save alert settings')
  return res.data.data
}

export async function fetchFoodAlerts() {
  const res = await api.get('/store/food-alerts')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load food alerts')
  return {
    alerts: res.data.data || [],
    settings: { ...DEFAULT_FOOD_ALERT_SETTINGS, ...(res.data.settings || {}) },
  }
}
