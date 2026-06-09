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
    const profile = inferTrainingProfile(goalText, [])
    await shortDelay()
    return {
      keywords,
      feedback: `根据你的描述，重点会放在 ${keywords.join('、')}。${profile.summary}选择训练日期后，可以立即生成对应计划。`,
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

  const profile = inferTrainingProfile(goalText || '', diary || [])
  const plans = []
  selectedDays.forEach((day, index) => {
    const context = buildPlanContext(day, index, plans, diary || [])
    plans.push(buildPlan(day, planKeywords, index, diary || [], profile, context))
  })
  await shortDelay()
  return {
    keywords: planKeywords,
    feedback: `已为 ${selectedDays.length} 个训练日生成计划，主题会围绕 ${planKeywords.join('、')} 轮换安排。${profile.summary}`,
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

function buildPlan(day, keywords, index, diary, profile, context) {
  const focus = chooseFocus(keywords, index, diary, context)
  const strength = chooseStrength(focus, keywords, index, profile, context)
  const warmup = pickWarmup(focus)
  const stretch = pickStretch(focus)
  const cardio = chooseCardio(focus, keywords, profile, context)
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
    intensityLevel: profile.level,
    intensityReason: intensityReason(profile, focus, index, day, context),
    trainingBenefit: trainingBenefit(focus, keywords, context),
    updatedAt: new Date().toISOString(),
  }
}

function chooseFocus(keywords, index, diary, context) {
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
  const avoided = new Set([recent[0], context.previousFocus].filter(Boolean))
  return sequence.find((focus, itemIndex) => itemIndex >= index % sequence.length && !avoided.has(focus)) || sequence[index % sequence.length]
}

function chooseStrength(focus, keywords, index, profile, context) {
  const text = keywords.join(' ')
  const preferred = exerciseLibrary.filter((exercise) => {
    if (focus === 'cardio') return exercise.muscle === 'cardio' || exercise.timed
    return matchesFocus(exercise.muscle, focus)
  })
  const fallback = exerciseLibrary.filter((exercise) => !matchesFocus(exercise.muscle, focus))
  const pool = [...preferred, ...fallback].slice(0, text.includes('减脂') || text.includes('瘦腹') ? 5 : 4)
  return pool.map((exercise, exerciseIndex) => {
    const heavy = text.includes('力量') || text.includes('增肌')
    const fatLoss = text.includes('减脂') || text.includes('瘦腹')
    const setAdjustment = profile.setAdjustment + context.setAdjustment
    const restAdjustment = profile.restAdjustment + context.restAdjustment
    const baseSets = heavy && exercise.muscle === 'legs' ? 5 : heavy ? 4 : Number(exercise.defaultSets || 3)
    const baseRest = heavy ? 90 : fatLoss ? Math.max(30, Number(exercise.defaultRest || 45) - 15) : Number(exercise.defaultRest || 60)
    return {
      ...exercise,
      sets: Math.max(2, baseSets + setAdjustment),
      reps: fatLoss && exercise.timed ? Math.max(30, Number(exercise.defaultReps || 30)) : Number(exercise.defaultReps || 12),
      rest: Math.max(30, baseRest + restAdjustment),
      weight: heavy && !exercise.timed ? String(Math.max(20, 40 + index * 5 + exerciseIndex * 5 + profile.weightAdjustment + context.weightAdjustment)) : '',
      completedSets: 0,
    }
  })
}

function matchesFocus(muscle, focus) {
  const aliases = {
    push: ['chest', 'shoulders'],
    pull: ['back'],
  }
  return muscle === focus || aliases[focus]?.includes(muscle)
}

function chooseCardio(focus, keywords, profile, context) {
  const text = keywords.join(' ')
  const option = text.includes('减脂') || text.includes('瘦腹')
    ? cardioOptions.fatloss
    : text.includes('增肌') || text.includes('力量')
      ? cardioOptions.muscle
      : focus === 'core'
        ? cardioOptions.core
        : cardioOptions.shape
  return {
    ...option,
    duration: Math.max(8, Number(option.duration) + profile.cardioAdjustment + context.cardioAdjustment),
    intensity: `${option.intensity}；本次按${profile.level}安排，${context.cardioNote}。`,
  }
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

function buildPlanContext(day, index, plannedBefore, diary) {
  const previousPlan = plannedBefore[plannedBefore.length - 1]
  const previousDate = previousPlan?.date || previousPlan?.dateKey
  const gapDays = previousDate ? daysBetween(previousDate, day.date) : null
  const recentDiary = [...(diary || [])]
    .filter((item) => daysSince(item.createdAt || item.date) <= 28)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  const lastWorkout = recentDiary[0]
  const completion = completionRatio(lastWorkout)
  const skippedCount = Number(lastWorkout?.skipped?.length || 0)
  const needsRecovery = Boolean(gapDays === 1 || completion < 0.72 || skippedCount >= 2)
  const longGap = Boolean(gapDays && gapDays >= 4)
  const weekday = weekdayName(day.date)

  let setAdjustment = 0
  let restAdjustment = 0
  let cardioAdjustment = 0
  let weightAdjustment = 0
  if (needsRecovery) {
    setAdjustment -= 1
    restAdjustment += 15
    cardioAdjustment -= 3
    weightAdjustment -= 5
  } else if (longGap) {
    restAdjustment += 5
    cardioAdjustment -= 2
  } else if (gapDays && gapDays >= 2 && completion >= 0.9 && skippedCount === 0) {
    cardioAdjustment += 2
    weightAdjustment += 5
  }

  const intervalNote = !previousPlan
    ? `${day.label}${weekday}是本轮第 1 个训练日，先建立节奏`
    : gapDays === 1
      ? `距离上次${previousPlan.title}只隔 1 天，需要控制连续疲劳`
      : gapDays && gapDays >= 4
        ? `距离上次${previousPlan.title}间隔 ${gapDays} 天，先用可控强度重新进入状态`
        : `距离上次${previousPlan.title}间隔 ${gapDays || 2} 天，恢复时间较合理，可以稳步推进`
  const diaryNote = lastWorkout
    ? `最近一次实际训练完成了 ${Math.round(completion * 100)}%，跳过 ${skippedCount} 项，时长 ${lastWorkout.duration || '--'} 分钟`
    : '还没有实际训练日记，先按目标和日期节奏保守建立基线'
  const cardioNote = needsRecovery
    ? '有氧用于促进恢复，不追求冲刺'
    : longGap
      ? '有氧保持中等节奏，帮助重新唤醒心肺'
      : '有氧作为本次训练的收尾刺激，帮助提升耐力和消耗'

  return {
    index,
    previousFocus: previousPlan?.focus || '',
    previousTitle: previousPlan?.title || '',
    gapDays,
    weekday,
    intervalNote,
    diaryNote,
    cardioNote,
    setAdjustment,
    restAdjustment,
    cardioAdjustment,
    weightAdjustment,
    needsRecovery,
    longGap,
  }
}

function inferTrainingProfile(goalText, diary) {
  const text = goalText || ''
  const sessions = Array.isArray(diary) ? diary.length : 0
  const recentSessions = Array.isArray(diary)
    ? diary.filter((item) => daysSince(item.createdAt || item.date) <= 21).length
    : 0
  const mentionsRestart = /很久没练|很久没健身|久未|刚开始|新手|零基础|恢复训练|重新开始/.test(text)
  const mentionsRegular = /经常|规律|一直|按计划|每周|进阶|加强|提高强度/.test(text)

  if (mentionsRestart || (!mentionsRegular && sessions === 0)) {
    return {
      level: '恢复适应强度',
      summary: '考虑到你可能处在恢复或起步阶段，计划会降低总量、延长休息，先找回动作质量和训练习惯。',
      setAdjustment: -1,
      restAdjustment: 15,
      cardioAdjustment: -6,
      weightAdjustment: -15,
      reason: '久未训练或训练记录较少时，肌肉、关节和心肺都需要重新适应，先控制强度能降低酸痛和受伤风险。',
    }
  }

  if (mentionsRegular || recentSessions >= 6) {
    return {
      level: '进阶提升强度',
      summary: '你有较稳定的训练基础，计划会适度增加训练容量或负重刺激，推动继续进步。',
      setAdjustment: 1,
      restAdjustment: -10,
      cardioAdjustment: 4,
      weightAdjustment: 10,
      reason: '规律训练后身体已经适应基础刺激，需要通过增加组数、缩短休息或提高负重来继续产生训练适应。',
    }
  }

  return {
    level: '稳步进阶强度',
    summary: '计划会保持中等强度，在动作质量稳定的前提下逐步增加训练刺激。',
    setAdjustment: 0,
    restAdjustment: 0,
    cardioAdjustment: 0,
    weightAdjustment: 0,
    reason: '中等强度适合大多数有一定基础但尚未稳定进阶的人，可以兼顾训练效果和恢复。',
  }
}

function intensityReason(profile, focus, index, day, context) {
  const focusText = {
    legs: '臀腿训练对体能和恢复要求更高',
    push: '胸肩推力训练需要肩关节稳定和动作控制',
    pull: '背部训练需要先建立肩胛控制和发力感',
    core: '核心训练适合用稳定控制打基础',
    cardio: '体能训练会明显提高心率和疲劳感',
  }[focus] || '综合训练需要兼顾动作质量和恢复'
  const recoveryText = context.needsRecovery
    ? '本次会减少一点容量并延长休息，避免连续疲劳影响动作质量。'
    : context.longGap
      ? '间隔较长时不直接拉满强度，先用稳定容量找回训练状态。'
      : '恢复窗口较合适，本次可以在动作稳定的前提下推进训练刺激。'
  return `${day.label}${context.weekday}安排第 ${index + 1} 次训练。${context.intervalNote}；${context.diaryNote}。${profile.reason}${recoveryText}当天重点是${focusText}，所以设为${profile.level}。`
}

function trainingBenefit(focus, keywords, context) {
  const text = keywords.join(' ')
  const benefits = {
    legs: '帮助加强臀腿力量、髋膝稳定和基础代谢，对翘臀、减脂和力量提升都很关键。',
    push: '帮助加强胸肩推力、上肢线条和肩带稳定，让上半身训练更有支撑。',
    pull: '帮助加强背部宽度、肩胛控制和体态，对改善含胸、塑造倒三角很有帮助。',
    core: '帮助加强腹部抗伸展和骨盆控制，让腰腹更稳定，也能提升深蹲、硬拉等动作表现。',
    cardio: '帮助提升心肺耐力、热量消耗和训练恢复能力，适合减脂和体能提升。',
  }
  const sequenceText = context.previousTitle
    ? `和前一次${context.previousTitle}错开重点，减少同一部位连续疲劳。`
    : '作为本轮第一天，它会建立动作质量和心肺基线。'
  if (text.includes('减脂') || text.includes('瘦腹')) return `${benefits[focus] || benefits.core} ${sequenceText} 本次也会提高消耗，帮助腰腹和体脂管理。`
  if (text.includes('增肌') || text.includes('力量')) return `${benefits[focus] || benefits.legs} ${sequenceText} 本次会提供足够机械张力，帮助肌肉和力量增长。`
  return `${benefits[focus] || '帮助提升全身协调、基础力量和训练习惯。'} ${sequenceText}`
}

function daysSince(value) {
  if (!value) return Number.POSITIVE_INFINITY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return (Date.now() - date.getTime()) / 86400000
}

function daysBetween(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`)
  const end = new Date(`${endValue}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.round((end - start) / 86400000)
}

function completionRatio(item) {
  if (!item) return 1
  const completedSets = (item.completedExercises || []).reduce((sum, exercise) => sum + Number(exercise.sets || 0), 0)
  const skipped = Number(item.skipped?.length || 0)
  if (completedSets === 0 && skipped === 0) return 1
  return completedSets / Math.max(1, completedSets + skipped * 3)
}

function weekdayName(value) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return `周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`
}

function formatDateLabel(dateValue) {
  const [, month, day] = dateValue.split('-')
  return `${Number(month)}月${Number(day)}日`
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
