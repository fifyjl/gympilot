const keywordRules = [
  { keyword: '减脂', patterns: [/减脂/, /瘦/, /脂肪/, /体重/, /肉多/, /掉秤/] },
  { keyword: '瘦腹', patterns: [/肚子/, /小腹/, /腹部/, /腰腹/, /肚腩/, /马甲线/] },
  { keyword: '翘臀', patterns: [/屁股/, /臀/, /翘臀/, /臀腿/, /蜜桃臀/] },
  { keyword: '增肌', patterns: [/增肌/, /肌肉/, /变壮/, /围度/, /练大/] },
  { keyword: '胸肩', patterns: [/胸/, /肩/, /上肢/, /卧推/, /肩宽/] },
  { keyword: '背宽', patterns: [/背/, /倒三角/, /背宽/, /高位下拉/, /划船/] },
  { keyword: '力量', patterns: [/力量/, /大重量/, /硬拉/, /深蹲/, /爆发/] },
  { keyword: '体能', patterns: [/体能/, /耐力/, /心肺/, /跑步/, /喘/, /有氧/] },
  { keyword: '塑形', patterns: [/塑形/, /线条/, /体态/, /紧致/] },
]

export async function analyzeGoal(goalText) {
  try {
    const response = await fetch('/api/analyze-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalText }),
    })
    if (!response.ok) throw new Error('analyze_failed')
    return await response.json()
  } catch {
    const keywords = extractKeywords(goalText)
    return {
      keywords,
      feedback: `根据你的描述，重点会放在 ${keywords.join('、')}。确认后可以选择训练日期并生成对应计划。`,
    }
  }
}

export async function createPlansFromGoal({ goalText, keywords, selectedDates, diary }) {
  const selectedDays = selectedDates.map((date) => ({
    key: date,
    date,
    label: formatDateLabel(date),
  }))

  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goalText,
      keywords,
      selectedDays,
      diary,
    }),
  })
  if (!response.ok) throw new Error('plan_api_failed')
  const payload = await response.json()
  return {
    feedback: payload.feedback,
    keywords: payload.keywords,
    plans: payload.plans.map((plan) => ({
      ...plan,
      id: `${plan.dateKey}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      goals: payload.keywords,
      updatedAt: new Date().toISOString(),
    })),
  }
}

export function extractKeywords(goalText) {
  const text = goalText.trim()
  if (!text) return []
  const matched = keywordRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => rule.keyword)
  return [...new Set(matched.length ? matched : ['塑形', '体能'])].slice(0, 4)
}

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
