import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Apple,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LogOut,
  Mail,
  Flame,
  HeartPulse,
  Home,
  Library,
  NotebookPen,
  ShieldCheck,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Settings,
  SkipForward,
  Timer,
  Trash2,
  Watch,
} from 'lucide-react'
import { exerciseCategories, exerciseLibrary } from './data/exercises'
import { connectAppleWatch, readLatestWorkoutMetrics } from './services/appleWatch'
import { requestEmailCode, verifyEmailCode } from './services/auth'
import { analyzeGoal, createPlansFromGoal } from './services/goalEngine'
import { clearCurrentUser, createId, getCurrentUser, loadState, saveState, setCurrentUser, userDisplayName } from './services/storage'
import './App.css'

const navItems = [
  { id: 'today', label: '今日', icon: Home },
  { id: 'plan', label: '计划', icon: CalendarDays },
  { id: 'custom', label: '自定义', icon: Library },
  { id: 'diary', label: '日记', icon: NotebookPen },
  { id: 'settings', label: '我的', icon: Settings },
]

function initialState(user = getCurrentUser()) {
  const loaded = loadState(user?.email)
  return {
    ...loaded,
    profile: {
      ...loaded.profile,
      goalText: loaded.profile.goalText || '',
      goals: loaded.profile.goals || [],
      feedback: loaded.profile.feedback || '',
      notes: loaded.profile.notes || '',
    },
    selectedDates: loaded.selectedDates || [],
    plans: loaded.plans || [],
    customWorkouts: loaded.customWorkouts || [],
    diary: loaded.diary || [],
  }
}

function App() {
  const [user, setUser] = useState(() => getCurrentUser())
  const [state, setState] = useState(initialState)
  const [activeTab, setActiveTab] = useState('plan')
  const [goalDraft, setGoalDraft] = useState(state.profile.goalText)
  const [goalBusy, setGoalBusy] = useState(false)
  const [planBusy, setPlanBusy] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [runner, setRunner] = useState(null)
  const finishWorkoutRef = useRef(null)
  const [diaryFilterMonth, setDiaryFilterMonth] = useState(() => monthKey(new Date()))
  const [customMode, setCustomMode] = useState('list')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [customName, setCustomName] = useState('我的自定义计划')
  const [customDraft, setCustomDraft] = useState({ exercises: [] })

  useEffect(() => {
    if (user) saveState(state, user.email)
  }, [state, user])

  useEffect(() => {
    if (!runner || runner.paused) return undefined
    const tick = window.setInterval(() => {
      setRunner((current) => {
        if (!current || current.paused) return current
        if (current.timerTarget > 0 && current.timerLeft + 1 >= current.timerTarget) {
          return { ...current, timerLeft: current.timerTarget }
        }
        return { ...current, timerLeft: current.timerLeft + 1 }
      })
    }, 1000)
    return () => window.clearInterval(tick)
  }, [runner])

  useEffect(() => {
    if (!runner || !state.watch.connected || runner.paused) return undefined
    const sample = window.setInterval(async () => {
      const latest = await readLatestWorkoutMetrics()
      setState((current) => ({ ...current, watch: { ...current.watch, latest } }))
    }, 5000)
    return () => window.clearInterval(sample)
  }, [runner, state.watch.connected])

  const selectedPlan = state.plans.find((plan) => plan.id === selectedPlanId) || state.plans[0]
  const todayPlan = state.plans.find((plan) => plan.date === dateKey(new Date())) || state.plans[0]
  const diaryStats = useMemo(() => buildDiaryStats(state.diary, diaryFilterMonth), [state.diary, diaryFilterMonth])

  function updateState(updater) {
    setState((current) => (typeof updater === 'function' ? updater(current) : updater))
  }

  async function handleAnalyze() {
    const goalText = goalDraft.trim()
    if (!goalText) return
    setGoalBusy(true)
    try {
      const result = await analyzeGoal(goalText)
      updateState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          goalText,
          goals: result.keywords,
          feedback: result.feedback,
        },
      }))
    } finally {
      setGoalBusy(false)
    }
  }

  async function handleGeneratePlans() {
    if (state.profile.goals.length === 0 || state.selectedDates.length === 0) return
    setPlanBusy(true)
    try {
      const result = await createPlansFromGoal({
        goalText: state.profile.goalText,
        keywords: state.profile.goals,
        selectedDates: state.selectedDates,
        diary: state.diary,
      })
      updateState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          goals: result.keywords,
          feedback: result.feedback,
        },
        plans: result.plans,
      }))
      setSelectedPlanId(result.plans[0]?.id || null)
    } finally {
      setPlanBusy(false)
    }
  }

  function toggleDate(dateValue) {
    const exists = state.selectedDates.includes(dateValue)
    const remainingPlans = exists
      ? state.plans.filter((plan) => (plan.date || plan.dateKey) !== dateValue)
      : state.plans
    updateState((current) => {
      const selectedDates = exists
        ? current.selectedDates.filter((item) => item !== dateValue)
        : [...current.selectedDates, dateValue].sort()
      const plans = exists
        ? current.plans.filter((plan) => (plan.date || plan.dateKey) !== dateValue)
        : current.plans
      return { ...current, selectedDates, plans }
    })
    if (exists && selectedPlanId && !remainingPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(remainingPlans[0]?.id || null)
    }
  }

  function updatePlanTitle(planId, title) {
    updateState((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === planId ? { ...plan, title } : plan)),
    }))
  }

  function beginWorkout(workout, source = workout.source || '推荐') {
    if (!workout?.strength?.length) return
    const firstExercise = workout.strength[0]
    const firstDuration = setDuration(firstExercise)
    setRunner({
      workout,
      source,
      startedAt: new Date().toISOString(),
      exerciseIndex: 0,
      setIndex: 1,
      phase: 'work',
      timerTarget: firstDuration,
      timerLeft: 0,
      paused: false,
      completed: [],
      skipped: [],
    })
    setActiveTab('today')
  }

  function completeCurrentSet() {
    setRunner((current) => (current ? markSetCompleteSession(current, false, finishWorkout) : current))
  }

  function skipRest() {
    setRunner((current) => (current ? moveAfterRestSession(current, finishWorkout) : current))
  }

  function skipExercise() {
    setRunner((current) => {
      if (!current) return current
      const exercise = current.workout.strength[current.exerciseIndex]
      if (current.exerciseIndex < current.workout.strength.length - 1) {
        const nextExercise = current.workout.strength[current.exerciseIndex + 1]
        const nextDuration = setDuration(nextExercise)
        return {
          ...current,
          skipped: [...current.skipped, exercise.name],
          phase: 'work',
          exerciseIndex: current.exerciseIndex + 1,
          setIndex: 1,
          ...timerFields(current, nextDuration),
        }
      }
      finishWorkout({ ...current, skipped: [...current.skipped, exercise.name] })
      return null
    })
  }

  const finishWorkout = useCallback(async (session = runner) => {
    if (!session) return
    const endedAt = new Date().toISOString()
    const metrics = state.watch.connected ? await readLatestWorkoutMetrics() : null
    const groupedExercises = summarizeCompletedSets(session.completed)
    const duration = Math.max(1, Math.round((new Date(endedAt) - new Date(session.startedAt)) / 60000))
    const calories = metrics?.calories || Math.round(duration * 6.5 + groupedExercises.length * 18)
    const diaryItem = {
      id: createId('diary'),
      date: endedAt.slice(0, 10),
      planType: session.source,
      title: session.workout.title,
      focus: session.workout.focus,
      completedExercises: groupedExercises,
      skipped: session.skipped,
      duration,
      calories,
      watchMetrics: metrics,
      mood: '',
      createdAt: endedAt,
    }

    setState((current) => ({
      ...current,
      watch: metrics ? { ...current.watch, latest: metrics } : current.watch,
      diary: [diaryItem, ...current.diary],
    }))
    setRunner(null)
    setActiveTab('diary')
  }, [runner, state.watch.connected])

  useEffect(() => {
    finishWorkoutRef.current = finishWorkout
  }, [finishWorkout])

  async function syncWatch() {
    const connection = await connectAppleWatch()
    const latest = await readLatestWorkoutMetrics()
    updateState((current) => ({
      ...current,
      watch: { connected: connection.connected, latest },
    }))
  }

  function addExerciseToCustom(exercise) {
    setCustomDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          ...exercise,
          sets: exercise.defaultSets,
          reps: exercise.defaultReps,
          rest: exercise.defaultRest,
          timed: Boolean(exercise.timed),
          repLabel: exercise.timed ? '秒' : '次',
          weight: '',
          completedSets: 0,
        },
      ],
    }))
  }

  function updateCustomExercise(index, field, value) {
    setCustomDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, itemIndex) =>
        itemIndex === index
          ? field === 'timed'
            ? { ...exercise, timed: Boolean(value), repLabel: value ? '秒' : '次' }
            : { ...exercise, [field]: value }
          : exercise,
      ),
    }))
  }

  function removeCustomDraftExercise(index) {
    setCustomDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function confirmSaveCustom() {
    if (customDraft.exercises.length === 0) return
    const workout = {
      id: createId('custom'),
      source: '自定义',
      dateKey: dateKey(new Date()),
      date: dateKey(new Date()),
      dayLabel: '自定义',
      title: customName.trim() || '我的自定义计划',
      focus: 'custom',
      strength: customDraft.exercises,
      warmup: [],
      stretch: [],
      cardio: { type: '自选', duration: 0, intensity: '按需添加' },
      totalMinutes: customDraft.exercises.reduce((sum, item) => sum + Number(item.sets) * 4, 0),
      caloriesEstimate: 0,
      createdAt: new Date().toISOString(),
    }
    updateState((current) => ({
      ...current,
      customWorkouts: [workout, ...current.customWorkouts],
    }))
    setCustomDraft({ exercises: [] })
    setCustomName('我的自定义计划')
    setShowSaveDialog(false)
    setCustomMode('list')
  }

  function deleteCustomWorkout(id) {
    updateState((current) => ({
      ...current,
      customWorkouts: current.customWorkouts.filter((item) => item.id !== id),
    }))
  }

  function deleteDiary(id) {
    updateState((current) => ({
      ...current,
      diary: current.diary.filter((item) => item.id !== id),
    }))
  }

  function updateDiaryMood(id, mood) {
    updateState((current) => ({
      ...current,
      diary: current.diary.map((item) => (item.id === id ? { ...item, mood } : item)),
    }))
  }

  function handleLogin(nextUser) {
    const signedUser = {
      email: nextUser.email,
      signedInAt: nextUser.signedInAt || new Date().toISOString(),
    }
    const nextState = initialState(signedUser)
    setCurrentUser(signedUser)
    setUser(signedUser)
    setState(nextState)
    setGoalDraft(nextState.profile.goalText || '')
    setSelectedPlanId(null)
    setRunner(null)
    setActiveTab('plan')
  }

  function handleLogout() {
    clearCurrentUser()
    setUser(null)
    setState(initialState(null))
    setGoalDraft('')
    setSelectedPlanId(null)
    setRunner(null)
    setActiveTab('plan')
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <strong>GymPilot</strong>
          <span>{user.email} · 健身计划与训练追踪</span>
        </div>
        <button className={state.watch.connected ? 'watch-pill connected' : 'watch-pill'} onClick={syncWatch} type="button">
          <Watch size={17} />
          {state.watch.connected ? '⌚ 已同步' : '同步手表'}
        </button>
      </header>

      {activeTab === 'today' && (
        <TodayView
          plan={todayPlan}
          runner={runner}
          watch={state.watch}
          onBegin={beginWorkout}
          onCompleteSet={completeCurrentSet}
          onFinish={() => finishWorkout()}
          onPause={() => setRunner((current) => current ? { ...current, paused: !current.paused } : current)}
          onSkip={skipExercise}
          onSkipRest={skipRest}
        />
      )}

      {activeTab === 'plan' && (
        <PlanView
          calendarMonth={calendarMonth}
          feedback={state.profile.feedback}
          goalBusy={goalBusy}
          goalDraft={goalDraft}
          keywords={state.profile.goals}
          onAnalyze={handleAnalyze}
          onGoalDraft={setGoalDraft}
          onGeneratePlans={handleGeneratePlans}
          onMonthChange={setCalendarMonth}
          onSelectPlan={setSelectedPlanId}
          onToggleDate={toggleDate}
          onTitleChange={updatePlanTitle}
          onBegin={beginWorkout}
          editingPlanId={editingPlanId}
          onEdit={setEditingPlanId}
          planBusy={planBusy}
          plans={state.plans}
          selectedDates={state.selectedDates}
          selectedPlan={selectedPlan}
        />
      )}

      {activeTab === 'custom' && (
        <CustomView
          draft={customDraft}
          mode={customMode}
          onAddExercise={addExerciseToCustom}
          onBegin={(workout) => beginWorkout(workout, '自定义')}
          onDeleteWorkout={deleteCustomWorkout}
          onRemoveExercise={removeCustomDraftExercise}
          onSaveRequest={() => setShowSaveDialog(true)}
          onStartCreate={() => setCustomMode('edit')}
          onUpdateExercise={updateCustomExercise}
          savedWorkouts={state.customWorkouts}
        />
      )}

      {activeTab === 'diary' && (
        <DiaryView
          diary={state.diary}
          filterMonth={diaryFilterMonth}
          stats={diaryStats}
          onDelete={deleteDiary}
          onFilterMonth={setDiaryFilterMonth}
          onMood={updateDiaryMood}
        />
      )}

      {activeTab === 'settings' && (
        <ProfileView
          diary={state.diary}
          onLogout={handleLogout}
          onProfileChange={(profile) => updateState((current) => ({ ...current, profile: { ...current.profile, ...profile } }))}
          onSyncWatch={syncWatch}
          plans={state.plans}
          profile={state.profile}
          user={user}
          watch={state.watch}
        />
      )}

      {showSaveDialog && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>保存自定义计划</h3>
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="我的臀腿计划" />
            <div className="modal-actions">
              <button onClick={() => setShowSaveDialog(false)} type="button">取消</button>
              <button onClick={confirmSaveCustom} type="button">保存计划</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button className={activeTab === item.id ? 'active' : ''} key={item.id} onClick={() => setActiveTab(item.id)} type="button">
              <Icon size={19} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </main>
  )
}

function PlanView({
  calendarMonth,
  editingPlanId,
  feedback,
  goalBusy,
  goalDraft,
  keywords,
  onAnalyze,
  onBegin,
  onEdit,
  onGeneratePlans,
  onGoalDraft,
  onMonthChange,
  onSelectPlan,
  onTitleChange,
  onToggleDate,
  planBusy,
  plans,
  selectedDates,
  selectedPlan,
}) {
  return (
    <section className="screen">
      <section className="planner-hero">
        <textarea
          placeholder="我想减脂、瘦肚子、让屁股更翘一点"
          value={goalDraft}
          onChange={(event) => onGoalDraft(event.target.value)}
        />
        <button className="primary-button" onClick={onAnalyze} type="button">
          <RefreshCw size={18} />
          {goalBusy ? '分析中' : '分析'}
        </button>
        {keywords.length > 0 && (
          <div className="keyword-tags">
            {keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
          </div>
        )}
        {feedback && <p className="coach-feedback">{feedback}</p>}
        {keywords.length > 0 && (
          <button className="analysis-button" disabled={selectedDates.length === 0 || planBusy} onClick={onGeneratePlans} type="button">
            <CalendarDays size={18} />
            {planBusy ? '生成中' : '生成计划'}
          </button>
        )}
      </section>

      <MonthCalendar
        month={calendarMonth}
        onMonthChange={onMonthChange}
        onToggleDate={onToggleDate}
        plans={plans}
        selectedDates={selectedDates}
      />

      {selectedPlan ? (
        <PlanCard
          editing={editingPlanId === selectedPlan.id}
          onBegin={() => onBegin(selectedPlan)}
          onEdit={() => onEdit(editingPlanId === selectedPlan.id ? null : selectedPlan.id)}
          onTitleChange={(title) => onTitleChange(selectedPlan.id, title)}
          plan={selectedPlan}
          showDetails
        />
      ) : (
        <div className="empty-card">先输入目标并分析，再在月日历中选择训练日，最后生成计划。</div>
      )}

      {plans.length > 0 && (
        <div className="card-list compact-list">
          {plans.map((plan) => (
            <button className={plan.id === selectedPlan?.id ? 'mini-plan active' : 'mini-plan'} key={plan.id} onClick={() => onSelectPlan(plan.id)} type="button">
              <span>{plan.dayLabel}</span>
              <strong>{plan.title}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function MonthCalendar({ month, onMonthChange, onToggleDate, plans, selectedDates }) {
  const cells = monthCells(month)
  const planByDate = new Map(plans.map((plan) => [plan.date || plan.dateKey, plan]))
  return (
    <section className="month-card">
      <div className="month-head">
        <button onClick={() => onMonthChange(addMonths(month, -1))} type="button"><ChevronLeft size={18} /></button>
        <strong>{month.getFullYear()}年 {month.getMonth() + 1}月</strong>
        <button onClick={() => onMonthChange(addMonths(month, 1))} type="button"><ChevronRight size={18} /></button>
      </div>
      <div className="weekday-row">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="month-grid">
        {cells.map((cell) => {
          const selected = selectedDates.includes(cell.key)
          const plan = planByDate.get(cell.key)
          return (
            <button
              className={`${cell.inMonth ? '' : 'muted'} ${selected ? 'selected' : ''} ${plan ? 'planned' : ''}`}
              key={cell.key}
              onClick={() => onToggleDate(cell.key)}
              type="button"
            >
              <strong>{cell.date.getDate()}</strong>
              <span>{plan ? plan.title : selected ? '训练日' : '休息'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TodayView({ plan, runner, watch, onBegin, onCompleteSet, onFinish, onPause, onSkip, onSkipRest }) {
  if (runner) {
    return (
      <RunnerView
        runner={runner}
        watch={watch}
        onCompleteSet={onCompleteSet}
        onFinish={onFinish}
        onPause={onPause}
        onSkipRest={onSkipRest}
        onSkip={onSkip}
      />
    )
  }

  return (
    <section className="screen">
      <div className="section-title">
        <div>
          <p>今日训练</p>
          <h2>{plan ? plan.title : '今天没有计划'}</h2>
        </div>
        {watch.latest && <span className="heart-badge"><HeartPulse size={16} /> {watch.latest.heartRate} bpm</span>}
      </div>
      {plan ? <PlanCard plan={plan} onBegin={() => onBegin(plan)} showDetails /> : <div className="empty-card">到“计划”里选择日期并生成计划。</div>}
    </section>
  )
}

function RunnerView({ runner, watch, onCompleteSet, onFinish, onPause, onSkip, onSkipRest }) {
  const exercise = runner.workout.strength[runner.exerciseIndex]
  const progress = Math.round((runner.completed.length / totalSets(runner.workout.strength)) * 100)
  const isResting = runner.phase === 'rest'
  const timerText = runner.timerTarget > 0
    ? `${formatSeconds(runner.timerLeft)} / ${formatSeconds(runner.timerTarget)}`
    : formatSeconds(runner.timerLeft)
  return (
    <section className="screen runner-screen">
      <div className="runner-card">
        <div className={isResting ? 'runner-hero rest' : 'runner-hero'}>
          <span>{isResting ? '组间休息' : '逐组教程模式'}</span>
          <h2>{isResting ? '准备下一组' : exercise.name}</h2>
          <p>{isResting ? '休息结束后按“跳过休息”进入下一组。调整呼吸，补水，保持动作质量。' : exercise.illustration}</p>
          <div className="exercise-figure">{isResting ? 'REST' : exercise.image}</div>
        </div>
        <div className="watch-strip">
          <span><Timer size={16} /> {isResting ? '已休息' : '已训练'} {timerText}</span>
          <span><HeartPulse size={16} /> {watch.latest?.heartRate || '--'} bpm</span>
          <span><Flame size={16} /> {watch.latest?.calories || '--'} kcal</span>
        </div>
        <div className="set-panel">
          <div><span>器械</span><strong>{exercise.equipment}</strong></div>
          <div><span>当前组</span><strong>第 {runner.setIndex} / {exercise.sets} 组</strong></div>
          <div><span>目标</span><strong>{exercise.reps}{exercise.repLabel || '次'}</strong></div>
        </div>
        <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
        <div className="runner-actions">
          <button className="finish-button" onClick={onFinish} type="button">结束训练并保存</button>
          <div className={isResting ? 'runner-controls rest-controls' : 'runner-controls'}>
            {isResting ? (
              <button onClick={onSkipRest} type="button"><SkipForward size={18} /> 跳过休息</button>
            ) : (
              <button onClick={onCompleteSet} type="button"><Check size={18} /> 完成本组</button>
            )}
            <button onClick={onPause} type="button">{runner.paused ? <Play size={18} /> : <Pause size={18} />} {runner.paused ? '继续' : '暂停'}</button>
            {!isResting && <button onClick={onSkip} type="button"><SkipForward size={18} /> 跳过动作</button>}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlanCard({ plan, editing, onBegin, onEdit, onTitleChange, showDetails }) {
  const intensityLevel = plan.intensityLevel || '稳步进阶强度'
  const intensityReason = plan.intensityReason || '按中等强度安排，先保证动作质量和恢复，再逐步增加训练刺激。'
  const trainingBenefit = plan.trainingBenefit || '本次训练会帮助提升基础力量、心肺耐力和动作稳定性，为后续进阶打好基础。'

  return (
    <article className="plan-card">
      <div className="card-head">
        <div>
          <span>{plan.dayLabel || plan.date || '训练'} · {plan.source}</span>
          {editing ? <input value={plan.title} onChange={(event) => onTitleChange(event.target.value)} /> : <h3>{plan.title}</h3>}
        </div>
        <button className="start-button" onClick={onBegin} type="button"><Play size={18} /> 开始训练</button>
      </div>
      <div className="meta-row">
        <span><Activity size={15} /> {plan.totalMinutes}分钟</span>
        <span><Flame size={15} /> {plan.caloriesEstimate || '--'} kcal</span>
        <span><Dumbbell size={15} /> {plan.strength.length}个动作</span>
      </div>
      {showDetails && (
        <>
          <div className="plan-rationale">
            <div className="rationale-card intensity">
              <span>强度安排</span>
              <strong>{intensityLevel}</strong>
              <p>{intensityReason}</p>
            </div>
            <div className="rationale-card">
              <span>为什么这样练</span>
              <p>{trainingBenefit}</p>
            </div>
          </div>
          <div className="plan-sections">
            <MiniSection title="热身" items={plan.warmup.map((item) => `${item.name} · ${item.duration}分钟`)} />
            <MiniSection title="无氧训练" items={plan.strength.map((item) => `${item.name} · ${item.sets}组 x ${item.reps}${item.repLabel || '次'} · 休${item.rest}秒`)} />
            <MiniSection title="有氧训练" items={[`${plan.cardio.type} · ${plan.cardio.duration}分钟`, plan.cardio.intensity]} />
            <MiniSection title="拉伸放松" items={plan.stretch.map((item) => `${item.name} · ${item.duration}分钟`)} />
          </div>
        </>
      )}
      {onEdit && (
        <div className="card-actions">
          <button onClick={onEdit} type="button"><Save size={16} /> {editing ? '完成修改' : '修改标题'}</button>
        </div>
      )}
    </article>
  )
}

function MiniSection({ title, items }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mini-section">
      <button onClick={() => setOpen((value) => !value)} type="button"><strong>{title}</strong><span>{open ? '收起' : '展开'}</span></button>
      {open && items.map((item) => <span key={item}>{item}</span>)}
    </div>
  )
}

function CustomView({ draft, mode, onAddExercise, onBegin, onDeleteWorkout, onRemoveExercise, onSaveRequest, onStartCreate, onUpdateExercise, savedWorkouts }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const addedCounts = useMemo(() => {
    const counts = new Map()
    draft.exercises.forEach((exercise) => {
      counts.set(exercise.id, (counts.get(exercise.id) || 0) + 1)
    })
    return counts
  }, [draft.exercises])
  const filteredExercises = useMemo(
    () => selectedCategory === 'all'
      ? exerciseLibrary
      : exerciseLibrary.filter((exercise) => exercise.muscle === selectedCategory),
    [selectedCategory],
  )

  if (mode === 'edit') {
    return (
      <section className="screen">
        <div className="section-title">
          <div><p>自定义编辑</p><h2>选择动作并设置参数</h2></div>
          <button className="primary-button" onClick={onSaveRequest} type="button"><Save size={18} /> 保存计划</button>
        </div>
        <div className="builder-card">
          <div className="exercise-tabs" aria-label="动作分类">
            {exerciseCategories.map((category) => (
              <button
                className={selectedCategory === category.id ? 'active' : ''}
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="library-grid">
            {filteredExercises.map((exercise) => {
              const addedCount = addedCounts.get(exercise.id) || 0
              return (
                <button aria-pressed={addedCount > 0} className={addedCount > 0 ? 'added' : ''} key={exercise.id} onClick={() => onAddExercise(exercise)} type="button">
                  <span className="library-code">{exercise.image}</span>
                  <strong>{exercise.name}</strong>
                  <small>{exercise.category} · {exercise.equipment}</small>
                  {addedCount > 0 ? <span className="library-added"><Check size={13} /> 已添加{addedCount > 1 ? addedCount : ''}</span> : <Plus className="library-plus" size={16} />}
                </button>
              )
            })}
          </div>
          <div className="custom-list">
            {draft.exercises.map((exercise, index) => (
              <div className="custom-row" key={`${exercise.id}-${index}`}>
                <div className="custom-row-head">
                  <strong>{exercise.name}</strong>
                  <span>{exercise.equipment}</span>
                  <button className="text-danger" onClick={() => onRemoveExercise(index)} type="button">删除动作</button>
                </div>
                <div className="custom-params">
                  <TargetModePicker
                    timed={Boolean(exercise.timed)}
                    onChange={(value) => onUpdateExercise(index, 'timed', value)}
                  />
                  <NumberStepper label="组数" min={1} onChange={(value) => onUpdateExercise(index, 'sets', value)} unit="组" value={Number(exercise.sets)} />
                  <NumberStepper label={exercise.timed ? '秒数' : '次数'} min={1} onChange={(value) => onUpdateExercise(index, 'reps', value)} unit={exercise.repLabel || '次'} value={Number(exercise.reps)} />
                  <NumberStepper label="重量" min={0} onChange={(value) => onUpdateExercise(index, 'weight', value)} step={5} unit="kg" value={Number(exercise.weight || 0)} />
                  <NumberStepper label="休息" min={0} onChange={(value) => onUpdateExercise(index, 'rest', value)} step={5} unit="s" value={Number(exercise.rest)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen">
      <button className="create-custom-button" onClick={onStartCreate} type="button"><Plus size={20} /> 一键自定义计划</button>
      <div className="card-list">
        {savedWorkouts.length === 0 && <div className="empty-card">还没有自定义计划。</div>}
        {savedWorkouts.map((workout) => (
          <article className="custom-plan-card" key={workout.id}>
            <div>
              <span>自定义计划</span>
              <h3>{workout.title}</h3>
              <p>{workout.strength.length} 个动作 · {workout.totalMinutes} 分钟</p>
            </div>
            <div className="custom-card-actions">
              <button className="icon-button danger" onClick={() => onDeleteWorkout(workout.id)} type="button" aria-label="删除计划"><Trash2 size={18} /></button>
              <button className="start-button" onClick={() => onBegin(workout)} type="button"><Play size={18} /> 开始训练</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TargetModePicker({ timed, onChange }) {
  return (
    <div className="target-mode-picker">
      <span>目标</span>
      <div>
        <button className={!timed ? 'active' : ''} onClick={() => onChange(false)} type="button">次数</button>
        <button className={timed ? 'active' : ''} onClick={() => onChange(true)} type="button">秒数</button>
      </div>
    </div>
  )
}

function NumberStepper({ label, min = 0, onChange, step = 1, unit, value }) {
  function update(nextValue) {
    onChange(Math.max(min, nextValue))
  }
  return (
    <div className="number-stepper">
      <div><span>{label}</span><strong>{value} {unit}</strong></div>
      <div className="stepper-controls">
        <button onClick={() => update(Number(value) - step)} type="button">-</button>
        <input aria-label={label} min={min} onChange={(event) => update(Number(event.target.value || min))} type="number" value={value} />
        <button onClick={() => update(Number(value) + step)} type="button">+</button>
      </div>
    </div>
  )
}

function DiaryView({ diary, filterMonth, stats, onDelete, onFilterMonth, onMood }) {
  const filtered = diary.filter((item) => monthKey(new Date(item.createdAt || item.date)) === filterMonth)
  return (
    <section className="screen">
      <div className="section-title">
        <div><p>训练记录</p><h2>健身日记</h2></div>
        <input className="month-input" type="month" value={filterMonth} onChange={(event) => onFilterMonth(event.target.value)} />
      </div>
      <div className="chart-card">
        <div><strong>{stats.sessions}</strong><span>训练次数</span></div>
        <div><strong>{stats.totalCalories}</strong><span>卡路里</span></div>
        <div><strong>{stats.totalMinutes}</strong><span>分钟</span></div>
        <div><strong>{stats.completed}</strong><span>完成组数</span></div>
      </div>
      <div className="card-list">
        {filtered.length === 0 && <div className="empty-card">这个月还没有训练记录。</div>}
        {filtered.map((item) => (
          <article className="diary-card" key={item.id}>
            <div className="card-head">
              <div><span>{item.date} · {item.planType}</span><h3>{item.title}</h3></div>
              <button className="icon-button danger" onClick={() => onDelete(item.id)} type="button" aria-label="删除记录"><Trash2 size={18} /></button>
            </div>
            <div className="meta-row">
              <span><Dumbbell size={15} /> {item.completedExercises.length}个动作</span>
              <span><Activity size={15} /> {item.duration}分钟</span>
              <span><Flame size={15} /> {item.calories} kcal</span>
            </div>
            <ul className="done-list">{item.completedExercises.map((exercise) => <li key={exercise.name}>{exercise.name} · {exercise.sets}组</li>)}</ul>
            <textarea placeholder="记录今天的主观感受" value={item.mood} onChange={(event) => onMood(item.id, event.target.value)} />
          </article>
        ))}
      </div>
    </section>
  )
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  async function sendCode() {
    setBusy(true)
    setMessage('')
    try {
      const result = await requestEmailCode(email)
      setCodeSent(true)
      setMessage(result.message)
    } catch (error) {
      setMessage(error.message || '验证码发送失败')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode() {
    setBusy(true)
    setMessage('')
    try {
      const user = await verifyEmailCode(email, code)
      onLogin(user)
    } catch (error) {
      setMessage(error.message || '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <Dumbbell size={34} />
          <div>
            <strong>GymPilot</strong>
            <span>用邮箱登录，保留你的个人训练记录</span>
          </div>
        </div>
        <div className="login-form">
          <label>
            邮箱
            <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          </label>
          {codeSent && (
            <label>
              验证码
              <input inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value)} placeholder="6 位数字" value={code} />
            </label>
          )}
          <div className="login-actions">
            <button className="primary-button" disabled={busy} onClick={sendCode} type="button"><Mail size={18} /> {codeSent ? '重新获取' : '发送验证码'}</button>
            <button className="start-button" disabled={!codeSent || busy} onClick={verifyCode} type="button"><ShieldCheck size={18} /> 登录</button>
          </div>
          {message && <p className="login-message">{message}</p>}
        </div>
        <div className="login-note">
          <strong>数据隔离</strong>
          <span>每个邮箱会使用独立的本地训练档案。当前 GitHub Pages 部署会先使用演示验证码；接入邮件后端后可真实发送到邮箱。</span>
        </div>
      </section>
    </main>
  )
}

function ProfileView({ diary, onLogout, onProfileChange, onSyncWatch, plans, profile, user, watch }) {
  const stats = useMemo(() => ({
    sessions: diary.length,
    minutes: diary.reduce((sum, item) => sum + Number(item.duration || 0), 0),
    calories: diary.reduce((sum, item) => sum + Number(item.calories || 0), 0),
    completed: diary.reduce((sum, item) => sum + Number(item.completedExercises?.length || 0), 0),
  }), [diary])
  const latestDiary = diary.slice(0, 3)
  const nextPlan = [...plans].sort((a, b) => new Date(a.date || a.dateKey) - new Date(b.date || b.dateKey))
    .find((plan) => new Date(`${plan.date || plan.dateKey}T23:59:59`) >= new Date())

  return (
    <section className="screen">
      <div className="profile-hero">
        <div>
          <span>我的档案</span>
          <h2>{profile.name || userDisplayName(user)}</h2>
          <p>{user.email}</p>
        </div>
        <button className="icon-text-button" onClick={onLogout} type="button"><LogOut size={17} /> 退出登录</button>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="section-title compact">
            <div><p>个人资料</p><h2>身体与习惯</h2></div>
          </div>
          <div className="profile-form">
            <label>昵称<input value={profile.name || ''} onChange={(event) => onProfileChange({ name: event.target.value })} placeholder="你的名字" /></label>
            <label>训练基础<select value={profile.trainingLevel || '恢复适应'} onChange={(event) => onProfileChange({ trainingLevel: event.target.value })}><option>恢复适应</option><option>稳步进阶</option><option>长期规律</option></select></label>
            <label>年龄<input value={profile.age || ''} onChange={(event) => onProfileChange({ age: event.target.value })} inputMode="numeric" placeholder="28" /></label>
            <label>身高<input value={profile.height || ''} onChange={(event) => onProfileChange({ height: event.target.value })} inputMode="decimal" placeholder="175 cm" /></label>
            <label>体重<input value={profile.weight || ''} onChange={(event) => onProfileChange({ weight: event.target.value })} inputMode="decimal" placeholder="70 kg" /></label>
            <label>偏好时间<select value={profile.preferredTime || '晚上'} onChange={(event) => onProfileChange({ preferredTime: event.target.value })}><option>早晨</option><option>中午</option><option>晚上</option><option>不固定</option></select></label>
          </div>
        </div>

        <div className="profile-card">
          <div className="section-title compact">
            <div><p>当前目标</p><h2>{profile.goals?.join('、') || '还未设置目标'}</h2></div>
          </div>
          <textarea value={profile.goalText || ''} onChange={(event) => onProfileChange({ goalText: event.target.value })} placeholder="例如：减脂、增强心肺、每周训练 3 次" />
          <label className="single-field">周目标<input value={profile.weeklyTarget || ''} onChange={(event) => onProfileChange({ weeklyTarget: event.target.value })} placeholder="每周 3 次" /></label>
          {profile.feedback && <p className="coach-feedback">{profile.feedback}</p>}
        </div>
      </div>

      <div className="profile-stats">
        <div><strong>{stats.sessions}</strong><span>累计训练</span></div>
        <div><strong>{stats.minutes}</strong><span>训练分钟</span></div>
        <div><strong>{stats.calories}</strong><span>消耗 kcal</span></div>
        <div><strong>{stats.completed}</strong><span>完成动作</span></div>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="section-title compact">
            <div><p>接下来</p><h2>{nextPlan ? nextPlan.title : '暂无计划'}</h2></div>
          </div>
          <p className="profile-copy">{nextPlan ? `${nextPlan.dayLabel || nextPlan.date} · ${nextPlan.intensityLevel || '稳步进阶强度'} · ${nextPlan.totalMinutes} 分钟` : '到“计划”里选择训练日并生成计划。'}</p>
        </div>

        <div className="profile-card">
          <div className="section-title compact">
            <div><p>近期记录</p><h2>训练回顾</h2></div>
          </div>
          <div className="recent-list">
            {latestDiary.length === 0 && <span>还没有训练记录。</span>}
            {latestDiary.map((item) => <span key={item.id}>{item.date} · {item.title} · {item.duration} 分钟</span>)}
          </div>
        </div>
      </div>

      <div className="watch-card">
        <div>
          <Apple size={24} />
          <strong>{watch.connected ? '⌚ 已同步' : 'Apple Watch 接入'}</strong>
          <p>当前版本提供模拟读取心率和卡路里，真实接口位置保留在 src/services/appleWatch.js。</p>
        </div>
        <button className="primary-button" onClick={onSyncWatch} type="button"><Watch size={18} /> 同步模拟数据</button>
        {watch.latest && (
          <div className="watch-metrics">
            <span>心率 {watch.latest.heartRate} bpm</span>
            <span>累计卡路里 {watch.latest.calories} kcal</span>
            <span>时长 {watch.latest.duration} 分钟</span>
            <span>运动环 {watch.latest.rings.move}%</span>
          </div>
        )}
      </div>
    </section>
  )
}

function setDuration(exercise) {
  return exercise.timed ? Number(exercise.reps) : 0
}

function timerFields(session, target) {
  return {
    timerTarget: target,
    timerLeft: 0,
  }
}

function markSetCompleteSession(session, fromTimer, finishWorkout) {
  const exercise = session.workout.strength[session.exerciseIndex]
  const completedSet = {
    exerciseId: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    set: session.setIndex,
    reps: exercise.reps,
    weight: exercise.weight || '',
    fromTimer,
  }
  const next = { ...session, completed: [...session.completed, completedSet] }
  if (exercise.rest > 0 && !isLastSetOfWorkout(next)) {
    return { ...next, phase: 'rest', ...timerFields(next, Number(exercise.rest)) }
  }
  return moveAfterRestSession(next, finishWorkout)
}

function moveAfterRestSession(session, finishWorkout) {
  const exercise = session.workout.strength[session.exerciseIndex]
  if (session.setIndex < Number(exercise.sets)) {
    return { ...session, phase: 'work', setIndex: session.setIndex + 1, ...timerFields(session, setDuration(exercise)) }
  }
  if (session.exerciseIndex < session.workout.strength.length - 1) {
    const nextExercise = session.workout.strength[session.exerciseIndex + 1]
    return { ...session, phase: 'work', exerciseIndex: session.exerciseIndex + 1, setIndex: 1, ...timerFields(session, setDuration(nextExercise)) }
  }
  finishWorkout(session)
  return null
}

function isLastSetOfWorkout(session) {
  const exercise = session.workout.strength[session.exerciseIndex]
  return session.setIndex >= Number(exercise.sets) && session.exerciseIndex >= session.workout.strength.length - 1
}

function totalSets(exercises) {
  return exercises.reduce((sum, exercise) => sum + Number(exercise.sets), 0)
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function summarizeCompletedSets(sets) {
  const map = new Map()
  sets.forEach((set) => {
    const current = map.get(set.name) || { name: set.name, muscle: set.muscle, sets: 0, reps: set.reps, weight: set.weight }
    map.set(set.name, { ...current, sets: current.sets + 1 })
  })
  return [...map.values()]
}

function buildDiaryStats(diary, filterMonth) {
  const filtered = diary.filter((item) => monthKey(new Date(item.createdAt || item.date)) === filterMonth)
  const totalCalories = filtered.reduce((sum, item) => sum + Number(item.calories || 0), 0)
  const totalMinutes = filtered.reduce((sum, item) => sum + Number(item.duration || 0), 0)
  const completed = filtered.reduce(
    (sum, item) => sum + (item.completedExercises || []).reduce((setSum, exercise) => setSum + Number(exercise.sets || 0), 0),
    0,
  )
  return { sessions: filtered.length, totalCalories, totalMinutes, completed }
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function monthKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
  ].join('-')
}

function monthCells(month) {
  const first = startOfMonth(month)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - startOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() }
  })
}

export default App
