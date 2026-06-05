const STORAGE_KEY = 'gympilot-state-v4'
const LEGACY_KEYS = ['gympilot-state-v3', 'gympilot-state-v2']

const defaultState = {
  profile: {
    goalText: '',
    goals: [],
    notes: '',
    feedback: '',
  },
  selectedDates: [],
  plans: [],
  customWorkouts: [],
  diary: [],
  watch: {
    connected: false,
    latest: null,
  },
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    const selectedDates = parsed.selectedDates || []
    return {
      ...defaultState,
      ...parsed,
      selectedDates,
      plans: normalizePlanDates(parsed.plans || [], selectedDates),
      profile: {
        ...defaultState.profile,
        ...(parsed.profile || {}),
        feedback: sanitizeFeedback(parsed.profile?.feedback || ''),
      },
      watch: {
        ...defaultState.watch,
        ...(parsed.watch || {}),
      },
    }
  } catch {
    return defaultState
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY)
  return defaultState
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeFeedback(text) {
  return text
    .replaceAll(String.fromCharCode(65, 73), '系统')
    .replaceAll(`人工${'智能'}`, '系统')
}

function normalizePlanDates(plans, selectedDates) {
  const filtered = plans.filter((plan) => plan.date || plan.dateKey)
  if (selectedDates.length === 0) return filtered
  const selected = new Set(selectedDates)
  const needsRepair = filtered.some((plan) => !selected.has(plan.date || plan.dateKey))
  if (!needsRepair) return filtered

  return filtered.map((plan, index) => {
    const date = selectedDates[index]
    if (!date) return plan
    return {
      ...plan,
      date,
      dateKey: date,
      dayLabel: formatDateLabel(date),
    }
  })
}

function formatDateLabel(dateValue) {
  const [, month, day] = dateValue.split('-')
  return `${Number(month)}月${Number(day)}日`
}
