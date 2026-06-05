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
    return {
      ...defaultState,
      ...parsed,
      selectedDates: parsed.selectedDates || [],
      plans: (parsed.plans || []).filter((plan) => plan.date),
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
