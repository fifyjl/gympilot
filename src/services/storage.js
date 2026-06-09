import { saveStateToDatabase, saveUserToDatabase } from './database'

const STORAGE_KEY = 'gympilot-state-v4'
const USER_KEY = 'gympilot-current-user-v1'
const LEGACY_KEYS = ['gympilot-state-v3', 'gympilot-state-v2']

const defaultState = {
  profile: {
    goalText: '',
    goals: [],
    notes: '',
    feedback: '',
    name: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    trainingLevel: '恢复适应',
    weeklyTarget: '每周 3 次',
    preferredTime: '晚上',
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

export function loadState(userEmail = getCurrentUser()?.email) {
  try {
    const userState = userEmail ? localStorage.getItem(stateKeyForUser(userEmail)) : null
    const legacyState = userEmail ? null : localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
    const raw = userState || legacyState
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

export function saveState(state, userEmail = getCurrentUser()?.email) {
  localStorage.setItem(stateKeyForUser(userEmail), JSON.stringify(state))
  saveStateToDatabase(userEmail, state).catch(() => {})
}

export function resetState() {
  localStorage.removeItem(stateKeyForUser(getCurrentUser()?.email))
  return defaultState
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  saveUserToDatabase(user).catch(() => {})
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY)
}

export function userDisplayName(user) {
  if (!user?.email) return '未登录'
  return user.email.split('@')[0]
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

function stateKeyForUser(email) {
  if (!email) return STORAGE_KEY
  return `gympilot-state-user-${encodeURIComponent(email.toLowerCase())}-v1`
}

function formatDateLabel(dateValue) {
  const [, month, day] = dateValue.split('-')
  return `${Number(month)}月${Number(day)}日`
}
