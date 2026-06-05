const planSchema = {
  name: 'fitness_plan_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['keywords', 'feedback', 'plans'],
    properties: {
      keywords: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
      feedback: { type: 'string' },
      plans: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dateKey', 'dayLabel', 'source', 'focus', 'title', 'keywords', 'warmup', 'strength', 'cardio', 'stretch', 'totalMinutes', 'caloriesEstimate', 'intensityLevel', 'intensityReason', 'trainingBenefit'],
          properties: {
            dateKey: { type: 'string' },
            date: { type: 'string' },
            dayLabel: { type: 'string' },
            source: { type: 'string' },
            focus: { type: 'string' },
            title: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            warmup: { type: 'array', items: warmupItemSchema() },
            strength: { type: 'array', items: strengthItemSchema() },
            cardio: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'duration', 'intensity'],
              properties: {
                type: { type: 'string' },
                duration: { type: 'number' },
                intensity: { type: 'string' },
              },
            },
            stretch: { type: 'array', items: warmupItemSchema() },
            totalMinutes: { type: 'number' },
            caloriesEstimate: { type: 'number' },
            intensityLevel: { type: 'string' },
            intensityReason: { type: 'string' },
            trainingBenefit: { type: 'string' },
          },
        },
      },
    },
  },
  strict: true,
}

const analysisSchema = {
  name: 'fitness_goal_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['keywords', 'feedback'],
    properties: {
      keywords: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
      feedback: { type: 'string' },
    },
  },
  strict: true,
}

export function hasAiProvider(env) {
  return Boolean(providerConfig(env).apiKey)
}

export async function analyzeWithProvider(env, body) {
  const prompt = [
    '你是健身目标分析服务。',
    '根据用户描述提取2到4个中文关键词，并给一句简短反馈。',
    '关键词只使用训练目标词，例如：减脂、瘦腹、翘臀、增肌、胸肩、背宽、力量、体能、塑形。',
    '只输出 JSON，不要出现 AI 或人工智能字样。',
  ].join('\n')
  const data = await completeJson(env, {
    schema: analysisSchema,
    system: prompt,
    user: body,
    maxTokens: 700,
  })
  return {
    keywords: normalizeKeywords(data.keywords),
    feedback: data.feedback || '已分析目标，可以选择训练日期并生成计划。',
  }
}

export async function generateWithProvider(env, body) {
  const prompt = [
    '你是专业健身计划生成服务，必须只输出 JSON。',
    '根据用户目标和 selectedDays 为每个训练日生成一个计划。',
    '计划要适合普通健身房训练，动作讲解清楚，训练日之间避免完全重复。',
    '必须结合用户健身情况调整强度：很久没练、刚开始、新手、零基础时降低总量、延长休息、以动作质量和恢复为主；经常按计划训练、有规律训练记录或用户要求进阶时，可以适度增加组数、负重、密度或有氧时长；信息不明确时使用中等稳步进阶强度。',
    '每个计划必须填写 intensityLevel、intensityReason、trainingBenefit。intensityReason 要说明为什么按这个强度安排，并明确关联用户训练基础和当天训练重点；trainingBenefit 要说明这些训练可以加强哪些肌群、能力或体态目标。',
    'strength 每天 3 到 5 个动作；warmup 2 到 3 个；stretch 2 到 3 个。',
    'strength 动作必须包含 id、name、category、muscle、equipment、illustration、image、sets、reps、rest、weight、repLabel、timed。',
    'timed 动作 reps 表示秒数，repLabel 用“秒”；普通动作 repLabel 用“次”或空字符串。',
    '不要输出 Markdown，不要输出解释，只输出符合 schema 的 JSON。',
  ].join('\n')
  const data = await completeJson(env, {
    schema: planSchema,
    system: prompt,
    user: body,
    maxTokens: 4500,
  })
  return normalizePlanPayload(data, body)
}

async function completeJson(env, { schema, system, user, maxTokens }) {
  const config = providerConfig(env)
  if (!config.apiKey) throw new Error(`${config.provider}_api_key_missing`)
  if (config.provider === 'deepseek') {
    return completeDeepSeek(config, { system, user, maxTokens })
  }
  return completeOpenAI(config, { schema, system, user, maxTokens })
}

async function completeDeepSeek(config, { system, user, maxTokens }) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  })
  if (!response.ok) throw new Error(`deepseek_request_failed_${response.status}`)
  const data = await response.json()
  return parseJsonText(data.choices?.[0]?.message?.content)
}

async function completeOpenAI(config, { schema, system, user, maxTokens }) {
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: system }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(user) }] },
      ],
      max_output_tokens: maxTokens,
      text: {
        format: {
          type: 'json_schema',
          ...schema,
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`openai_request_failed_${response.status}`)
  const data = await response.json()
  const text = data.output_text || data.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text
  return parseJsonText(text)
}

function providerConfig(env) {
  const provider = String(env.AI_PROVIDER || env.VITE_AI_PROVIDER || 'deepseek').toLowerCase()
  if (provider === 'openai') {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-5.2',
      baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    }
  }
  return {
    provider: 'deepseek',
    apiKey: env.DEEPSEEK_API_KEY,
    model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    baseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  }
}

function normalizePlanPayload(payload, body) {
  const keywords = normalizeKeywords(payload.keywords?.length ? payload.keywords : body.keywords)
  const fallbackIntensity = inferFallbackIntensity(body)
  const plans = (payload.plans || []).map((plan, index) => {
    const day = body.selectedDays?.[index] || {}
    return {
      ...plan,
      dateKey: plan.dateKey || day.key || day.date,
      date: plan.date || day.date || day.key,
      dayLabel: plan.dayLabel || day.label || day.date || day.key,
      source: plan.source || '推荐',
      goals: keywords,
      keywords,
      intensityLevel: plan.intensityLevel || fallbackIntensity.level,
      intensityReason: plan.intensityReason || `${fallbackIntensity.reason}本日重点是${plan.title || plan.focus || '综合训练'}，所以按${fallbackIntensity.level}安排。`,
      trainingBenefit: plan.trainingBenefit || '本次训练会帮助提升基础力量、心肺耐力和动作稳定性，为后续进阶打好基础。',
      updatedAt: new Date().toISOString(),
    }
  })
  return {
    keywords,
    feedback: payload.feedback || `已生成 ${plans.length} 个训练日计划。`,
    plans,
  }
}

function inferFallbackIntensity(body) {
  const text = String(body.goalText || '')
  const diary = Array.isArray(body.diary) ? body.diary : []
  const recentSessions = diary.filter((item) => daysSince(item.createdAt || item.date) <= 21).length
  const mentionsRestart = /很久没练|很久没健身|久未|刚开始|新手|零基础|恢复训练|重新开始/.test(text)
  const mentionsRegular = /经常|规律|一直|按计划|每周|进阶|加强|提高强度/.test(text)

  if (mentionsRestart || (!mentionsRegular && diary.length === 0)) {
    return {
      level: '恢复适应强度',
      reason: '考虑到用户可能处在恢复或起步阶段，需要先降低总量、延长休息，找回动作质量和训练习惯。',
    }
  }

  if (mentionsRegular || recentSessions >= 6) {
    return {
      level: '进阶提升强度',
      reason: '用户有较稳定的训练基础，可以适度增加训练容量、密度或负重，推动继续进步。',
    }
  }

  return {
    level: '稳步进阶强度',
    reason: '用户具备一定训练基础但进阶信息不明确，适合用中等强度兼顾效果和恢复。',
  }
}

function daysSince(value) {
  if (!value) return Number.POSITIVE_INFINITY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return (Date.now() - date.getTime()) / 86400000
}

function normalizeKeywords(keywords) {
  const clean = Array.isArray(keywords) ? keywords.filter(Boolean).map(String).slice(0, 4) : []
  return clean.length ? clean : ['塑形', '体能']
}

function parseJsonText(text) {
  if (!text) throw new Error('empty_ai_response')
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(trimmed)
}

function warmupItemSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'name', 'duration', 'illustration'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      duration: { type: 'number' },
      illustration: { type: 'string' },
    },
  }
}

function strengthItemSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'name', 'category', 'muscle', 'equipment', 'illustration', 'image', 'sets', 'reps', 'rest', 'weight', 'repLabel', 'timed'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      category: { type: 'string' },
      muscle: { type: 'string' },
      equipment: { type: 'string' },
      illustration: { type: 'string' },
      image: { type: 'string' },
      sets: { type: 'number' },
      reps: { type: 'number' },
      rest: { type: 'number' },
      weight: { type: 'string' },
      repLabel: { type: 'string' },
      timed: { type: 'boolean' },
    },
  }
}
