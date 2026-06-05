import { cardioOptions, exerciseLibrary, stretchLibrary, warmupLibrary } from '../data/exercises'
import { createId } from './storage'

const keywordRules = [
  { keyword: '减脂', patterns: [/减脂/, /瘦/, /脂肪/, /体重/, /掉秤/, /燃脂/] },
  { keyword: '瘦腹', patterns: [/肚子/, /小腹/, /腹部/, /腰腹/, /马甲线/] },
  { keyword: '翘臀', patterns: [/臀/, /屁股/, /翘臀/, /蜜桃臀/] },
  { keyword: '增肌', patterns: [/增肌/, /肌肉/, /围度/, /练大/, /变壮/] },
  { keyword: '胸肩', patterns: [/胸/, /肩/, /上肢/, /卧推/, /肩宽/] },
  { keyword: '背宽', patterns: [/背/, /倒三角/, /背宽/, /下拉/, /划船/] },
  { keyword: '力量', patterns: [/力量/, /大重量/, /硬拉/, /深蹲/, /爆发/] },
  { keyword: '体能', patterns: [/体能/, /耐力/, /心肺/, /跑步/, /有氧/] },
  { keyword: '塑形', patterns: [/塑形/, /线条/, /体态/, /紧致/] },
]

const focusTitles = {
  fatCore: ['瘦腹燃脂', '核心耐力', '全身消耗', '腰腹强化'],
  glutes: ['臀腿力量', '后链强化', '翘臀容量', '单侧稳定'],
  upper: ['胸肩容量', '推力训练', '上肢泵感', '肩背稳定'],
  back: ['背宽塑形', '划船力量', '背阔控制', '肩背稳定'],
  endurance: ['体能循环', '心肺耐力', '绳索核心', '混合耐力'],
  shape: ['综合塑形', '线条训练', '均衡训练', '体态强化'],
}

export async function analyzeGoal(goalText) {
  try {
    return await postJsonWithTimeout('/api/analyze-goal', { goalText }, 4000)
  } catch {
    const keywords = extractKeywords(goalText)
    await shortDelay()
    return {
      keywords,
      feedback: `根据你的描述，重点会放在 ${keywords.join('、')}。选择训练日期后，可以立即生成对应计划。`,
    }
  }
}

export async function createPlansFromGoal({ goalText, keywords, selectedDates, diary }) {
  const planKeywords = keywords?.length ? keywords : extractKeywords(goalText || '')
  const selectedDays = selectedDates.map((date) => ({
    key: date,
    date,
    label: formatDateLabel(date),
  }))

  try {
    const payload = await postJsonWithTimeout('/api/generate-plan', {
      goalText,
      keywords: planKeywords,
      selectedDays,
      diary,
    }, Number(import.meta.env.VITE_AI_TIMEOUT_MS || 7000))

    return {
      keywords: payload.keywords || planKeywords,
      feedback: payload.feedback || `已为 ${selectedDays.length} 个训练日生成计划。`,
      plans: (payload.plans || []).map((plan) => ({
        ...plan,
        id: createId(`plan-${plan.dateKey || plan.date}`),
        goals: payload.keywords || planKeywords,
        updatedAt: new Date().toISOString(),
      })),
    }
  } catch {
    // GitHub Pages has no backend, and model APIs can be slow. Always keep generation usable.
  }

  const plans = selectedDays.map((day, index) => buildPlan(day, planKeywords, index, diary || []))
  await shortDelay()
  return {
    keywords: planKeywords,
    feedback: `已为 ${selectedDays.length} 个训练日生成计划，主题会围绕 ${planKeywords.join('、')} 轮换安排。`,
    plans,
  }
}

export function extractKeywords(goalText) {
  const text = goalText.trim()
  if (!text) return ['塑形', '体能']
  const matched = keywordRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => rule.keyword)
  return [...new Set(matched.length ? matched : ['塑形', '体能'])].slice(0, 4)
}

function buildPlan(day, keywords, index, diary) {
  const focus = chooseFocus(keywords, index, diary)
  const strength = chooseStrength(focus, keywords, index)
  const warmup = pickWarmup(focus)
  const stretch = pickStretch(focus)
  const cardio = chooseCardio(focus, keywords)
  const strengthMinutes = strength.reduce((sum, item) => sum + Number(item.sets) * 4, 0)
  const totalMinutes =
    warmup.reduce((sum, item) => sum + Number(item.duration), 0) +
    strengthMinutes +
    Number(cardio.duration) +
    stretch.reduce((sum, item) => sum + Number(item.duration), 0)

  return {
    id: createId(`plan-${day.key}`),
    dateKey: day.key,
    date: day.date,
    dayLabel: day.label,
    source: '推荐',
    focus,
    title: titleForFocus(focus, keywords, index),
    goals: keywords,
    keywords,
    warmup,
    strength,
    cardio,
    stretch,
    totalMinutes,
    caloriesEstimate: Math.round(totalMinutes * calorieRate(focus, keywords)),
    updatedAt: new Date().toISOString(),
  }
}

function chooseFocus(keywords, index, diary) {
  const text = keywords.join(' ')
  const sequence = text.includes('翘臀') || text.includes('力量')
    ? ['legs', 'core', 'legs', 'pull']
    : text.includes('胸肩')
      ? ['push', 'pull', 'push', 'core']
      : text.includes('背宽')
        ? ['pull', 'push', 'pull', 'core']
        : text.includes('体能') || text.includes('减脂') || text.includes('瘦腹')
          ? ['core', 'cardio', 'legs', 'core']
          : ['push', 'legs', 'pull', 'core']
  const recent = diary.slice(0, 2).flatMap((item) => item.completedExercises || []).map((item) => item.muscle)
  return sequence.find((focus, itemIndex) => itemIndex >= index % sequence.length && recent[0] !== focus) || sequence[index % sequence.length]
}

function chooseStrength(focus, keywords, index) {
  const text = keywords.join(' ')
  const preferred = exerciseLibrary.filter((exercise) => {
    if (focus === 'cardio') return exercise.muscle === 'cardio' || exercise.timed
    return exercise.muscle === focus
  })
  const fallback = exerciseLibrary.filter((exercise) => exercise.muscle !== focus)
  const pool = [...preferred, ...fallback].slice(0, text.includes('减脂') || text.includes('瘦腹') ? 5 : 4)
  return pool.map((exercise, exerciseIndex) => {
    const heavy = text.includes('力量') || text.includes('增肌')
    const fatLoss = text.includes('减脂') || text.includes('瘦腹')
    return {
      ...exercise,
      sets: heavy && exercise.muscle === 'legs' ? 5 : heavy ? 4 : Number(exercise.defaultSets || 3),
      reps: fatLoss && exercise.timed ? Math.max(30, Number(exercise.defaultReps || 30)) : Number(exercise.defaultReps || 12),
      rest: heavy ? 90 : fatLoss ? Math.max(30, Number(exercise.defaultRest || 45) - 15) : Number(exercise.defaultRest || 60),
      weight: heavy && !exercise.timed ? String(40 + index * 5 + exerciseIndex * 5) : '',
      completedSets: 0,
    }
  })
}

function chooseCardio(focus, keywords) {
  const text = keywords.join(' ')
  if (text.includes('减脂') || text.includes('瘦腹')) return cardioOptions.fatloss
  if (text.includes('增肌') || text.includes('力量')) return cardioOptions.muscle
  if (focus === 'core') return cardioOptions.core
  return cardioOptions.shape
}

function pickWarmup(focus) {
  const ids = focus === 'legs' ? ['walk', 'hip-circle', 'dead-bug'] : focus === 'push' || focus === 'pull' ? ['walk', 'band-pull'] : ['walk', 'dead-bug']
  return ids.map((id) => warmupLibrary.find((item) => item.id === id)).filter(Boolean)
}

function pickStretch(focus) {
  const ids = focus === 'legs' ? ['hamstring', 'child-pose'] : focus === 'push' ? ['chest-open', 'lat-stretch'] : ['lat-stretch', 'child-pose']
  return ids.map((id) => stretchLibrary.find((item) => item.id === id)).filter(Boolean)
}

function titleForFocus(focus, keywords, index) {
  const text = keywords.join(' ')
  const group = text.includes('减脂') || text.includes('瘦腹')
    ? 'fatCore'
    : text.includes('翘臀') || (text.includes('力量') && focus === 'legs')
      ? 'glutes'
      : text.includes('胸肩')
        ? 'upper'
        : text.includes('背宽')
          ? 'back'
          : text.includes('体能')
            ? 'endurance'
            : 'shape'
  const titles = focusTitles[group]
  return titles[index % titles.length]
}

function calorieRate(focus, keywords) {
  const text = keywords.join(' ')
  if (text.includes('减脂') || text.includes('体能')) return 7.4
  if (focus === 'legs') return 6.6
  if (focus === 'core') return 6.8
  return 6.1
}

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function shortDelay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 250)
  })
}

async function postJsonWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`request_failed_${response.status}`)
    return await response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}
