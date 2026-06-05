import {
  cardioOptions,
  exerciseLibrary,
  stretchLibrary,
  warmupLibrary,
  weekDays,
} from '../data/exercises'
import { createId } from './storage'

const blueprintMap = {
  fatCore: {
    match: ['减脂', '瘦腹'],
    titles: ['瘦腹燃脂', '核心耐力', '全身消耗', '腰腹强化'],
    focuses: ['core', 'cardio', 'legs', 'core'],
    exerciseIds: ['plank', 'cable-crunch', 'leg-raise', 'battle-rope', 'push-up'],
    cardio: { type: '椭圆机间歇', duration: 24, intensity: '2分钟快 + 1分钟慢，保持明显出汗' },
    warmupIds: ['walk', 'dead-bug', 'hip-circle'],
    stretchIds: ['child-pose', 'hamstring', 'lat-stretch'],
    calorieRate: 7.8,
  },
  glutePower: {
    match: ['翘臀', '力量'],
    titles: ['臀腿力量', '后链强化', '翘臀容量', '下肢力量'],
    focuses: ['legs', 'legs', 'pull', 'legs'],
    exerciseIds: ['squat', 'romanian-deadlift', 'hip-thrust', 'leg-raise'],
    cardio: { type: '坡度快走', duration: 12, intensity: '低冲击，坡度8-12，保护力量恢复' },
    warmupIds: ['walk', 'hip-circle', 'dead-bug'],
    stretchIds: ['hamstring', 'child-pose'],
    calorieRate: 6.4,
  },
  chestShoulder: {
    match: ['增肌', '胸肩'],
    titles: ['胸肩容量', '推力增肌', '上肢泵感', '胸肩强化'],
    focuses: ['push', 'pull', 'push', 'legs'],
    exerciseIds: ['bench-press', 'shoulder-press', 'push-up', 'seated-row'],
    cardio: { type: '坡度快走', duration: 10, intensity: '中低强度，避免影响增肌恢复' },
    warmupIds: ['walk', 'band-pull'],
    stretchIds: ['chest-open', 'lat-stretch'],
    calorieRate: 5.8,
  },
  backWidth: {
    match: ['背宽'],
    titles: ['背宽塑形', '拉力强化', '倒三角背部', '背部控制'],
    focuses: ['pull', 'push', 'pull', 'core'],
    exerciseIds: ['lat-pulldown', 'seated-row', 'shoulder-press', 'plank'],
    cardio: { type: '划船机', duration: 16, intensity: '中等强度，保持肩胛控制' },
    warmupIds: ['walk', 'band-pull'],
    stretchIds: ['lat-stretch', 'chest-open'],
    calorieRate: 6.1,
  },
  endurance: {
    match: ['体能'],
    titles: ['体能循环', '心肺耐力', '全身间歇', '耐力强化'],
    focuses: ['cardio', 'core', 'legs', 'push'],
    exerciseIds: ['battle-rope', 'push-up', 'plank', 'squat'],
    cardio: { type: '动感单车区间', duration: 25, intensity: '4分钟稳态 + 1分钟冲刺循环' },
    warmupIds: ['walk', 'hip-circle', 'dead-bug'],
    stretchIds: ['child-pose', 'hamstring', 'chest-open'],
    calorieRate: 7.2,
  },
  muscle: {
    match: ['增肌'],
    titles: ['增肌容量', '推拉腿基础', '力量增肌', '肌肉围度'],
    focuses: ['push', 'pull', 'legs', 'push'],
    exerciseIds: ['bench-press', 'lat-pulldown', 'squat', 'romanian-deadlift', 'shoulder-press'],
    cardio: cardioOptions.muscle,
    warmupIds: ['walk', 'band-pull', 'hip-circle'],
    stretchIds: ['chest-open', 'lat-stretch', 'hamstring'],
    calorieRate: 5.9,
  },
  shape: {
    match: ['塑形'],
    titles: ['综合塑形', '线条训练', '体态强化', '均衡训练'],
    focuses: ['push', 'legs', 'pull', 'core'],
    exerciseIds: ['push-up', 'hip-thrust', 'seated-row', 'plank'],
    cardio: cardioOptions.shape,
    warmupIds: ['walk', 'hip-circle', 'band-pull'],
    stretchIds: ['chest-open', 'lat-stretch', 'child-pose'],
    calorieRate: 6.3,
  },
}

export function generateWeeklyPlan({ selectedDayKeys, goals, diary }) {
  const days = weekDays.filter((day) => selectedDayKeys.includes(day.key))
  const picked = []

  return days.map((day, index) => {
    const blueprint = chooseBlueprint(goals, index)
    const focus = chooseFocus(blueprint, index, diary, picked)
    picked.push(focus)
    const strength = buildStrength(blueprint, goals, focus, index)
    const warmup = pickByIds(warmupLibrary, blueprint.warmupIds)
    const stretch = pickByIds(stretchLibrary, blueprint.stretchIds)
    const strengthMinutes = strength.reduce((sum, item) => sum + Number(item.sets) * 4, 0)
    const totalMinutes =
      warmup.reduce((sum, item) => sum + item.duration, 0) +
      strengthMinutes +
      blueprint.cardio.duration +
      stretch.reduce((sum, item) => sum + item.duration, 0)

    return {
      id: createId(`plan-${day.key}`),
      dateKey: day.key,
      dayLabel: day.label,
      source: '推荐',
      focus,
      title: blueprint.titles[index % blueprint.titles.length],
      goals: [...goals],
      keywords: [...goals],
      warmup,
      strength,
      cardio: blueprint.cardio,
      stretch,
      totalMinutes,
      caloriesEstimate: Math.round(totalMinutes * blueprint.calorieRate),
      updatedAt: new Date().toISOString(),
    }
  })
}

export function regenerateSinglePlan({ oldPlan, goals, diary }) {
  const plan = generateWeeklyPlan({
    selectedDayKeys: [oldPlan.dateKey],
    goals,
    diary: [
      {
        completedExercises: [{ muscle: oldPlan.focus }],
      },
      ...diary,
    ],
  })[0]

  return { ...plan, id: oldPlan.id, dateKey: oldPlan.dateKey, dayLabel: oldPlan.dayLabel }
}

function chooseBlueprint(goals, index) {
  const goalText = goals.join(' ')
  if (/减脂/.test(goalText) && /瘦腹/.test(goalText)) return blueprintMap.fatCore
  if (/翘臀|臀腿/.test(goalText) && /力量/.test(goalText)) return blueprintMap.glutePower
  if (/增肌/.test(goalText) && /胸肩/.test(goalText)) return blueprintMap.chestShoulder
  if (/背宽/.test(goalText)) return blueprintMap.backWidth
  if (/体能|耐力|心肺/.test(goalText)) return blueprintMap.endurance
  if (/增肌/.test(goalText)) return blueprintMap.muscle
  if (/翘臀|臀腿/.test(goalText)) return blueprintMap.glutePower
  const fallback = [blueprintMap.shape, blueprintMap.fatCore, blueprintMap.backWidth]
  return fallback[index % fallback.length]
}

function chooseFocus(blueprint, index, diary, picked) {
  const recent = diary
    .slice(0, 3)
    .flatMap((item) => item.completedExercises || [])
    .map((item) => item.muscle)
  const blocked = new Set([recent[0], picked[index - 1]].filter(Boolean))
  const preferred = blueprint.focuses[index % blueprint.focuses.length]
  if (!blocked.has(preferred)) return preferred
  return blueprint.focuses.find((focus) => !blocked.has(focus)) || preferred
}

function buildStrength(blueprint, goals, focus, dayIndex) {
  const pool = pickByIds(exerciseLibrary, blueprint.exerciseIds)
  const focusFirst = [
    ...pool.filter((exercise) => exercise.muscle === focus),
    ...pool.filter((exercise) => exercise.muscle !== focus),
  ]
  const count = /增肌|力量|翘臀/.test(goals.join(' ')) ? 4 : 5

  return focusFirst.slice(0, count).map((exercise, exerciseIndex) => {
    const heavy = goals.includes('力量') || goals.includes('翘臀')
    const muscleGain = goals.includes('增肌')
    const fatCore = goals.includes('减脂') || goals.includes('瘦腹')
    const sets = heavy && exercise.muscle === 'legs' ? 5 : muscleGain ? 4 : exercise.defaultSets
    const reps = heavy && exercise.muscle === 'legs' ? 6 : fatCore && exercise.timed ? Math.max(30, exercise.defaultReps) : exercise.defaultReps
    const rest = heavy ? 120 : muscleGain ? 90 : exercise.defaultRest

    return {
      ...exercise,
      sets,
      reps,
      rest,
      weight: heavy ? String(60 + dayIndex * 5 + exerciseIndex * 5) : '',
      completedSets: 0,
    }
  })
}

function pickByIds(list, ids) {
  return ids.map((id) => list.find((item) => item.id === id)).filter(Boolean)
}
