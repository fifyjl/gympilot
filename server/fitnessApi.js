/* global process */

const responseSchema = {
  name: 'fitness_plan_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['keywords', 'feedback', 'plans'],
    properties: {
      keywords: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string' },
      },
      feedback: { type: 'string' },
      plans: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'dateKey',
            'dayLabel',
            'source',
            'focus',
            'title',
            'keywords',
            'warmup',
            'strength',
            'cardio',
            'stretch',
            'totalMinutes',
            'caloriesEstimate',
          ],
          properties: {
            dateKey: { type: 'string' },
            dayLabel: { type: 'string' },
            source: { type: 'string' },
            focus: { type: 'string' },
            title: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            warmup: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'duration', 'illustration'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  duration: { type: 'number' },
                  illustration: { type: 'string' },
                },
              },
            },
            strength: {
              type: 'array',
              items: {
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
              },
            },
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
            stretch: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'duration', 'illustration'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  duration: { type: 'number' },
                  illustration: { type: 'string' },
                },
              },
            },
            totalMinutes: { type: 'number' },
            caloriesEstimate: { type: 'number' },
          },
        },
      },
    },
  },
  strict: true,
}

export function fitnessApiPlugin() {
  return {
    name: 'fitness-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze-goal', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'method_not_allowed' })
          return
        }

        try {
          const body = await readJson(req)
          const payload = process.env.OPENAI_API_KEY
            ? await analyzeWithOpenAI(body)
            : mockAnalyze(body)
          sendJson(res, 200, payload)
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'analyze_failed' })
        }
      })

      server.middlewares.use('/api/generate-plan', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'method_not_allowed' })
          return
        }

        try {
          const body = await readJson(req)
          const payload = process.env.OPENAI_API_KEY
            ? await generateWithOpenAI(body)
            : mockGenerate(body)
          sendJson(res, 200, payload)
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'generate_failed' })
        }
      })
    },
  }
}

async function analyzeWithOpenAI(body) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: '你是健身目标分析服务。根据用户自然语言提炼2到4个中文关键词，并给一句自然语言反馈。不要输出 AI 或 人工智能 字样。',
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(body) }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
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
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`openai_analyze_failed_${response.status}`)
  const data = await response.json()
  const text = data.output_text || data.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('openai_empty_response')
  return JSON.parse(text)
}

async function generateWithOpenAI(body) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                '你是专业健身计划生成服务。必须输出 JSON。',
                '根据用户自然语言目标提取 2-4 个中文关键词。',
                '每个训练日必须有不同主题，且无氧动作和有氧模式不能简单重复。',
                '动作必须包含器械、讲解、组数、次数或秒数、休息秒数。',
                '不要在输出中出现 AI 或 人工智能 字样。',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(body),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...responseSchema,
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`openai_request_failed_${response.status}`)
  }

  const data = await response.json()
  const text = data.output_text || data.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text
  if (!text) throw new Error('openai_empty_response')
  return normalizePayload(JSON.parse(text), body)
}

function mockGenerate(body) {
  const keywords = usableKeywords(body.keywords) ? body.keywords : extractKeywords(body.goalText || '')
  const selectedDays = body.selectedDays || []
  const history = body.diary || []
  const templates = chooseTemplates(keywords)
  const plans = selectedDays.map((day, index) => buildPlan(day, templates[index % templates.length], keywords, index, history))
  return {
    keywords,
    feedback: `根据你的描述，重点会放在 ${keywords.join('、')}。本周 ${selectedDays.length} 练会拆成不同主题，训练日之间轮换部位，并参考历史日记避开连续刺激同一部位。`,
    plans,
  }
}

function usableKeywords(keywords) {
  return Array.isArray(keywords) && keywords.length > 0 && keywords.every((keyword) => /[\u4e00-\u9fa5]/.test(keyword) && !keyword.includes('?'))
}

function mockAnalyze(body) {
  const keywords = extractKeywords(body.goalText || '')
  return {
    keywords,
    feedback: `根据你的描述，重点会放在 ${keywords.join('、')}。确认后可以选择训练日期并生成对应计划。`,
  }
}

function normalizePayload(payload, body) {
  return {
    ...payload,
    plans: payload.plans.map((plan, index) => ({
      ...plan,
      dateKey: plan.dateKey || body.selectedDays[index]?.key,
      dayLabel: plan.dayLabel || body.selectedDays[index]?.label,
      source: '推荐',
    })),
  }
}

function extractKeywords(text) {
  const rules = [
    ['减脂', /减脂|瘦|脂肪|肉多|掉秤/],
    ['瘦腹', /肚子|小腹|腹部|腰腹|肚腩|马甲线/],
    ['翘臀', /屁股|臀|翘臀|臀腿|蜜桃臀/],
    ['增肌', /增肌|肌肉|变壮|围度|练大/],
    ['胸肩', /胸|肩|上肢|卧推|肩宽/],
    ['背宽', /背|倒三角|背宽|高位下拉|划船/],
    ['力量', /力量|大重量|硬拉|深蹲|爆发/],
    ['体能', /体能|耐力|心肺|跑步|有氧|喘/],
    ['塑形', /塑形|线条|体态|紧致/],
  ]
  const matched = rules.filter(([, pattern]) => pattern.test(text)).map(([keyword]) => keyword)
  return [...new Set(matched.length ? matched : ['塑形', '体能'])].slice(0, 4)
}

function chooseTemplates(keywords) {
  const text = keywords.join(' ')
  if (text.includes('减脂') && text.includes('瘦腹')) return [fatBurnCore(), coreEndurance(), metabolicLegs(), waistControl()]
  if (text.includes('翘臀') || (text.includes('力量') && text.includes('臀'))) return [gluteStrength(), posteriorChain(), gluteVolume(), unilateralLegs()]
  if (text.includes('增肌') && text.includes('胸肩')) return [chestVolume(), shoulderStrength(), upperPump(), pushAccessory()]
  if (text.includes('背宽')) return [backWidth(), rowStrength(), latControl(), rearDelt()]
  if (text.includes('体能')) return [conditioningCircuit(), bikeIntervals(), ropeCore(), mixedEndurance()]
  if (text.includes('增肌')) return [chestVolume(), backWidth(), gluteStrength(), shoulderStrength()]
  return [shapeBalance(), gluteVolume(), backWidth(), coreEndurance()]
}

function buildPlan(day, template, keywords, index) {
  const strengthMinutes = template.strength.reduce((sum, item) => sum + item.sets * 4, 0)
  const totalMinutes = template.warmup.reduce((sum, item) => sum + item.duration, 0) + strengthMinutes + template.cardio.duration + template.stretch.reduce((sum, item) => sum + item.duration, 0)
  return {
    dateKey: day.key,
    date: day.date,
    dayLabel: day.label,
    source: '推荐',
    focus: template.focus,
    title: template.title,
    keywords,
    warmup: template.warmup,
    strength: template.strength,
    cardio: template.cardio,
    stretch: template.stretch,
    totalMinutes,
    caloriesEstimate: Math.round(totalMinutes * (template.calorieRate || 6.5) + index * 19),
  }
}

function ex(id, name, category, muscle, equipment, illustration, image, sets, reps, rest, options = {}) {
  return { id, name, category, muscle, equipment, illustration, image, sets, reps, rest, weight: options.weight || '', repLabel: options.repLabel || '', timed: Boolean(options.timed) }
}

function warm(id, name, duration) {
  return { id, name, duration, illustration: `${name}，逐步进入训练状态。` }
}

function stretch(id, name, duration) {
  return { id, name, duration, illustration: `${name}，保持稳定呼吸。` }
}

function fatBurnCore() {
  return {
    title: '瘦腹燃脂',
    focus: 'core',
    warmup: [warm('walk-fast', '跑步机快走', 5), warm('dead-bug', '死虫激活', 3), warm('hip-circle', '髋关节环绕', 2)],
    strength: [
      ex('battle-rope', '战绳间歇', '体能', 'cardio', '战绳', '核心收紧，双臂快速交替发力。', 'HIIT', 6, 30, 45, { repLabel: '秒', timed: true }),
      ex('plank', '平板支撑', '核心', 'core', '瑜伽垫', '肋骨内收，骨盆微后倾，保持身体成直线。', 'PLANK', 3, 45, 45, { repLabel: '秒', timed: true }),
      ex('cable-crunch', '绳索卷腹', '核心', 'core', '绳索器械', '用腹部卷曲脊柱，不靠手臂下拉。', 'CORE', 3, 12, 60),
      ex('leg-raise', '悬垂举腿', '核心', 'core', '单杠 / 罗马椅', '骨盆向上卷起，控制下放。', 'ABS', 3, 10, 60),
    ],
    cardio: { type: '椭圆机间歇', duration: 24, intensity: '2分钟快 + 1分钟慢，保持明显出汗' },
    stretch: [stretch('child-pose', '婴儿式呼吸', 3), stretch('cobra', '腹部伸展', 2), stretch('lat', '背阔肌拉伸', 2)],
    calorieRate: 7.8,
  }
}

function coreEndurance() {
  return {
    title: '核心耐力',
    focus: 'core',
    warmup: [warm('row-easy', '划船机轻划', 5), warm('cat-cow', '猫牛式', 2), warm('dead-bug', '死虫激活', 3)],
    strength: [
      ex('hollow-hold', 'Hollow Hold', '核心', 'core', '瑜伽垫', '下背贴地，肩胛离地，保持张力。', 'HOLD', 4, 30, 45, { repLabel: '秒', timed: true }),
      ex('side-plank', '侧桥', '核心', 'core', '瑜伽垫', '身体成直线，髋部不要下沉。', 'SIDE', 3, 35, 45, { repLabel: '秒', timed: true }),
      ex('pallof-press', '抗旋推胸', '核心', 'core', '绳索 / 弹力带', '保持骨盆稳定，双手向前推出。', 'ANTI', 3, 12, 60),
      ex('mountain-climber', '登山跑', '体能', 'cardio', '无器械', '肩在手腕上方，膝盖快速交替前提。', 'FAST', 4, 40, 45, { repLabel: '秒', timed: true }),
    ],
    cardio: { type: '划船机节奏训练', duration: 18, intensity: '500米稳态 + 250米加速循环' },
    stretch: [stretch('cobra', '腹部伸展', 2), stretch('child-pose', '婴儿式呼吸', 3), stretch('hip-flexor', '髋屈肌拉伸', 2)],
    calorieRate: 7.1,
  }
}

function metabolicLegs() {
  return {
    title: '全身消耗',
    focus: 'legs',
    warmup: [warm('bike-easy', '单车热身', 5), warm('body-squat', '徒手深蹲', 2), warm('lunge', '动态弓步', 2)],
    strength: [
      ex('goblet-squat', '高脚杯深蹲', '腿臀', 'legs', '壶铃 / 哑铃', '胸口打开，膝盖跟随脚尖。', 'LEG', 4, 12, 60),
      ex('kettlebell-swing', '壶铃摆动', '体能', 'legs', '壶铃', '髋部爆发，不用手臂硬拉。', 'SWING', 5, 15, 60),
      ex('step-up', '台阶上步', '腿臀', 'legs', '训练凳 / 哑铃', '脚掌踩稳，控制下放。', 'STEP', 3, 12, 60),
      ex('push-up', '俯卧撑', '胸部', 'push', '无器械', '身体保持直线，胸口靠近地面后推起。', 'BODY', 3, 12, 45),
    ],
    cardio: { type: '跑步机坡度循环', duration: 22, intensity: '坡度10快走4分钟 + 平路慢走1分钟' },
    stretch: [stretch('hamstring', '腘绳肌拉伸', 2), stretch('glute', '臀肌拉伸', 2), stretch('calf', '小腿拉伸', 2)],
    calorieRate: 7.6,
  }
}

function waistControl() {
  return {
    title: '腰腹强化',
    focus: 'core',
    warmup: [warm('walk', '快走热身', 5), warm('breathing', '腹式呼吸', 2), warm('bird-dog', '鸟狗激活', 3)],
    strength: [
      ex('ab-wheel', '健腹轮', '核心', 'core', '健腹轮', '肋骨下沉，推出时保持骨盆稳定。', 'WHEEL', 4, 8, 75),
      ex('farmer-carry', '农夫走', '核心', 'core', '哑铃 / 壶铃', '肩下沉，身体不左右晃。', 'CARRY', 4, 40, 60, { repLabel: '米' }),
      ex('reverse-crunch', '反向卷腹', '核心', 'core', '瑜伽垫', '骨盆向上卷起，不借惯性。', 'ABS', 3, 12, 60),
    ],
    cardio: { type: '楼梯机稳态', duration: 20, intensity: '中等强度，保持可说短句' },
    stretch: [stretch('child-pose', '婴儿式呼吸', 3), stretch('cobra', '腹部伸展', 2), stretch('side-bend', '体侧拉伸', 2)],
    calorieRate: 7.0,
  }
}

function gluteStrength() {
  return {
    title: '臀腿力量',
    focus: 'legs',
    warmup: [warm('bike', '单车热身', 5), warm('hip-circle', '髋关节环绕', 2), warm('glute-bridge', '臀桥激活', 3)],
    strength: [
      ex('squat', '深蹲', '腿臀', 'legs', '深蹲架 / 杠铃', '脚跟踩稳，膝盖跟随脚尖，下蹲到大腿接近平行。', 'LEG', 5, 5, 150, { weight: '80' }),
      ex('hip-thrust', '臀推', '腿臀', 'legs', '臀推凳 / 杠铃', '顶峰夹臀，避免腰椎过度反弓。', 'HIP', 5, 6, 150, { weight: '90' }),
      ex('romanian-deadlift', '罗马尼亚硬拉', '腿臀', 'legs', '杠铃 / 哑铃', '髋部向后折叠，感受大腿后侧拉长。', 'HINGE', 4, 6, 120, { weight: '70' }),
    ],
    cardio: { type: '坡度快走', duration: 12, intensity: '低冲击，坡度8-12，保护力量恢复' },
    stretch: [stretch('hamstring', '腘绳肌拉伸', 2), stretch('glute', '臀肌拉伸', 3), stretch('hip-flexor', '髋屈肌拉伸', 2)],
    calorieRate: 6.4,
  }
}

function posteriorChain() {
  return {
    title: '后链强化',
    focus: 'legs',
    warmup: [warm('walk', '跑步机快走', 5), warm('hinge-drill', '髋铰链练习', 3), warm('band-walk', '弹力带侧走', 2)],
    strength: [
      ex('deadlift', '硬拉', '腿臀', 'legs', '杠铃', '背部保持中立，髋膝同步发力。', 'HINGE', 5, 4, 180, { weight: '90' }),
      ex('good-morning', '早安式', '腿臀', 'legs', '杠铃', '小幅度髋折叠，感受后链张力。', 'GM', 3, 8, 120, { weight: '40' }),
      ex('ham-curl', '腿弯举', '腿臀', 'legs', '腿弯举机', '顶峰收紧腘绳肌，慢速下放。', 'CURL', 4, 10, 90),
      ex('back-extension', '山羊挺身', '腿臀', 'legs', '罗马椅', '臀部主导发力，不要过度挺腰。', 'BACK', 3, 12, 75),
    ],
    cardio: { type: '椭圆机恢复', duration: 10, intensity: '低强度，促进恢复' },
    stretch: [stretch('hamstring', '腘绳肌拉伸', 3), stretch('glute', '臀肌拉伸', 3)],
    calorieRate: 6.2,
  }
}

function gluteVolume() {
  return {
    title: '翘臀容量',
    focus: 'legs',
    warmup: [warm('bike', '单车热身', 5), warm('band-walk', '弹力带侧走', 3), warm('glute-bridge', '臀桥激活', 2)],
    strength: [
      ex('hip-thrust', '臀推', '腿臀', 'legs', '臀推凳 / 杠铃', '顶峰夹臀停顿1秒。', 'HIP', 4, 10, 90, { weight: '70' }),
      ex('bulgarian-split-squat', '保加利亚分腿蹲', '腿臀', 'legs', '哑铃 / 训练凳', '身体微前倾，臀部主导发力。', 'SPLIT', 3, 10, 90),
      ex('cable-kickback', '绳索后踢腿', '腿臀', 'legs', '绳索器械', '骨盆稳定，腿向后上方踢。', 'KICK', 3, 15, 60),
      ex('abduction', '髋外展', '腿臀', 'legs', '髋外展机', '顶峰外展停顿，控制回放。', 'ABD', 3, 18, 60),
    ],
    cardio: { type: '楼梯机臀腿模式', duration: 15, intensity: '中低强度，专注臀部发力' },
    stretch: [stretch('glute', '臀肌拉伸', 3), stretch('quad', '股四头肌拉伸', 2), stretch('hip-flexor', '髋屈肌拉伸', 2)],
    calorieRate: 6.5,
  }
}

function unilateralLegs() {
  return {
    title: '单侧稳定',
    focus: 'legs',
    warmup: [warm('walk', '快走热身', 5), warm('ankle', '踝关节活动', 2), warm('lunge', '动态弓步', 2)],
    strength: [
      ex('walking-lunge', '行走箭步蹲', '腿臀', 'legs', '哑铃', '步幅稳定，前脚掌踩实。', 'LUNGE', 4, 12, 90),
      ex('single-leg-rdl', '单腿罗马尼亚硬拉', '腿臀', 'legs', '哑铃', '髋部保持水平，慢速下放。', '1LEG', 3, 10, 90),
      ex('step-up', '台阶上步', '腿臀', 'legs', '训练凳', '用上方腿发力站起。', 'STEP', 3, 12, 75),
    ],
    cardio: { type: '单车恢复', duration: 14, intensity: '轻中强度，维持稳定踏频' },
    stretch: [stretch('hamstring', '腘绳肌拉伸', 2), stretch('glute', '臀肌拉伸', 3)],
    calorieRate: 6.0,
  }
}

function chestVolume() {
  return {
    title: '胸肩容量',
    focus: 'push',
    warmup: [warm('walk', '快走热身', 5), warm('band-pull', '弹力带拉开', 2), warm('push-up-light', '跪姿俯卧撑', 2)],
    strength: [
      ex('bench-press', '卧推', '胸部', 'push', '杠铃 / 卧推架', '肩胛收紧，杠铃落到胸中下部。', 'PUSH', 4, 8, 120, { weight: '70' }),
      ex('incline-db-press', '上斜哑铃卧推', '胸部', 'push', '哑铃 / 上斜凳', '肘部略内收，推起时胸上部发力。', 'INCL', 4, 10, 90),
      ex('cable-fly', '绳索夹胸', '胸部', 'push', '绳索器械', '手臂微屈，胸部向中间夹紧。', 'FLY', 3, 12, 75),
      ex('shoulder-press', '哑铃肩推', '肩部', 'push', '哑铃', '核心收紧，向上推至手臂接近伸直。', 'DB', 3, 10, 90),
    ],
    cardio: { type: '坡度快走', duration: 10, intensity: '中低强度，避免影响增肌恢复' },
    stretch: [stretch('chest-open', '胸肩打开', 3), stretch('lat', '背阔肌拉伸', 2)],
    calorieRate: 5.8,
  }
}

function shoulderStrength() {
  return {
    title: '肩部力量',
    focus: 'push',
    warmup: [warm('walk', '快走热身', 5), warm('band-pull', '弹力带拉开', 2), warm('external-rotation', '肩外旋激活', 2)],
    strength: [
      ex('overhead-press', '站姿推举', '肩部', 'push', '杠铃', '臀腹收紧，杠铃沿面部前方直线上推。', 'OHP', 5, 5, 150, { weight: '45' }),
      ex('lateral-raise', '侧平举', '肩部', 'push', '哑铃', '手肘微屈，抬到肩高即可。', 'SIDE', 4, 12, 60),
      ex('rear-delt-fly', '俯身反向飞鸟', '肩部', 'pull', '哑铃', '肩胛稳定，后束发力外展。', 'REAR', 3, 15, 60),
      ex('push-up', '俯卧撑', '胸部', 'push', '无器械', '身体保持直线，胸口靠近地面。', 'BODY', 3, 12, 60),
    ],
    cardio: { type: '椭圆机轻有氧', duration: 12, intensity: '低到中等强度' },
    stretch: [stretch('chest-open', '胸肩打开', 3), stretch('neck', '斜方肌放松', 2)],
    calorieRate: 5.7,
  }
}

function upperPump() {
  return {
    title: '上肢泵感',
    focus: 'push',
    warmup: [warm('row-easy', '划船机轻划', 5), warm('band-pull', '弹力带拉开', 2)],
    strength: [
      ex('machine-chest-press', '器械推胸', '胸部', 'push', '推胸机', '背贴靠垫，胸部主导发力。', 'MACH', 4, 12, 75),
      ex('arnold-press', '阿诺德推举', '肩部', 'push', '哑铃', '旋转上推，控制下放。', 'ARN', 3, 10, 75),
      ex('cable-fly-low', '低位绳索夹胸', '胸部', 'push', '绳索器械', '从低位向上夹，感受胸上部。', 'FLY', 3, 14, 60),
      ex('triceps-pushdown', '绳索下压', '手臂', 'push', '绳索器械', '肘固定，向下伸直手臂。', 'TRI', 3, 12, 60),
    ],
    cardio: { type: '动感单车轻踩', duration: 10, intensity: '轻中强度，放松上肢' },
    stretch: [stretch('chest-open', '胸肩打开', 3), stretch('triceps', '肱三头肌拉伸', 2)],
    calorieRate: 5.6,
  }
}

function pushAccessory() {
  return {
    title: '推力辅助',
    focus: 'push',
    warmup: [warm('walk', '快走热身', 5), warm('scap-push', '肩胛俯卧撑', 2)],
    strength: [
      ex('dips', '双杠臂屈伸', '胸部', 'push', '双杠', '身体微前倾，胸部和肱三头发力。', 'DIP', 4, 8, 90),
      ex('landmine-press', '地雷管推举', '肩部', 'push', '杠铃地雷管', '单臂向前上方推，核心抗旋。', 'LAND', 3, 10, 75),
      ex('pec-deck', '蝴蝶机夹胸', '胸部', 'push', '蝴蝶机', '胸部夹紧，慢速回放。', 'PEC', 3, 12, 60),
    ],
    cardio: { type: '跑步机轻走', duration: 10, intensity: '恢复性有氧' },
    stretch: [stretch('chest-open', '胸肩打开', 3), stretch('lat', '背阔肌拉伸', 2)],
    calorieRate: 5.5,
  }
}

function backWidth() {
  return {
    title: '背宽塑形',
    focus: 'pull',
    warmup: [warm('row-easy', '划船机轻划', 5), warm('band-pull', '弹力带拉开', 2)],
    strength: [
      ex('lat-pulldown', '高位下拉', '背部', 'pull', '高位下拉机', '肩胛先下沉，再把把手拉到锁骨前方。', 'PULL', 4, 10, 90),
      ex('straight-arm-pulldown', '直臂下压', '背部', 'pull', '绳索器械', '手臂固定微屈，背阔肌向下发力。', 'LAT', 3, 12, 75),
      ex('seated-row', '坐姿划船', '背部', 'pull', '坐姿划船机', '拉向下肋位置，顶峰收紧背部。', 'ROW', 4, 10, 90),
      ex('face-pull', '面拉', '肩背', 'pull', '绳索器械', '拉向眉心，外旋肩部。', 'FACE', 3, 15, 60),
    ],
    cardio: { type: '划船机稳态', duration: 16, intensity: '中等强度，保持肩胛控制' },
    stretch: [stretch('lat', '背阔肌拉伸', 3), stretch('chest-open', '胸肩打开', 2)],
    calorieRate: 6.1,
  }
}

function rowStrength() {
  return {
    title: '划船力量',
    focus: 'pull',
    warmup: [warm('row-easy', '划船机轻划', 5), warm('thoracic', '胸椎旋转', 2)],
    strength: [
      ex('barbell-row', '杠铃划船', '背部', 'pull', '杠铃', '髋部折叠，杠铃拉向下腹。', 'ROW', 5, 6, 120, { weight: '60' }),
      ex('one-arm-row', '单臂哑铃划船', '背部', 'pull', '哑铃 / 训练凳', '肘向髋部拉，背部收紧。', '1ROW', 4, 10, 90),
      ex('lat-pulldown-neutral', '中立握下拉', '背部', 'pull', '高位下拉机', '肘向身体两侧下拉。', 'PULL', 3, 10, 90),
    ],
    cardio: { type: '椭圆机稳态', duration: 14, intensity: '中等强度，呼吸稳定' },
    stretch: [stretch('lat', '背阔肌拉伸', 3), stretch('forearm', '前臂放松', 2)],
    calorieRate: 6.0,
  }
}

function latControl() {
  return {
    title: '背阔控制',
    focus: 'pull',
    warmup: [warm('walk', '快走热身', 5), warm('scap-depress', '肩胛下沉练习', 3)],
    strength: [
      ex('assisted-pullup', '辅助引体向上', '背部', 'pull', '辅助引体机', '肩胛下沉，胸口向杠靠近。', 'PULL', 4, 8, 90),
      ex('straight-arm-pulldown', '直臂下压', '背部', 'pull', '绳索器械', '背阔肌控制下压，不耸肩。', 'LAT', 4, 12, 75),
      ex('machine-row', '器械划船', '背部', 'pull', '划船机', '胸贴垫，肘向后拉。', 'MROW', 3, 12, 75),
    ],
    cardio: { type: '划船机技术间歇', duration: 15, intensity: '1分钟技术划 + 1分钟轻划循环' },
    stretch: [stretch('lat', '背阔肌拉伸', 3), stretch('child-pose', '婴儿式呼吸', 2)],
    calorieRate: 6.0,
  }
}

function rearDelt() {
  return {
    title: '肩背稳定',
    focus: 'pull',
    warmup: [warm('band-pull', '弹力带拉开', 3), warm('external-rotation', '肩外旋激活', 2)],
    strength: [
      ex('face-pull', '面拉', '肩背', 'pull', '绳索器械', '拉向眉心，肩部外旋。', 'FACE', 4, 15, 60),
      ex('rear-delt-fly', '反向飞鸟', '肩背', 'pull', '哑铃 / 蝴蝶机', '后束发力，手臂外展。', 'REAR', 4, 12, 60),
      ex('seated-row-wide', '宽握坐姿划船', '背部', 'pull', '坐姿划船机', '肘打开，收紧上背。', 'WROW', 3, 12, 75),
    ],
    cardio: { type: '单车稳态', duration: 14, intensity: '低冲击中等强度' },
    stretch: [stretch('chest-open', '胸肩打开', 2), stretch('lat', '背阔肌拉伸', 3)],
    calorieRate: 5.9,
  }
}

function conditioningCircuit() {
  return {
    title: '体能循环',
    focus: 'cardio',
    warmup: [warm('bike-easy', '单车热身', 5), warm('jumping-jack', '开合跳', 2)],
    strength: [
      ex('battle-rope', '战绳间歇', '体能', 'cardio', '战绳', '核心收紧，双臂交替发力。', 'HIIT', 6, 30, 30, { repLabel: '秒', timed: true }),
      ex('kettlebell-swing', '壶铃摆动', '体能', 'legs', '壶铃', '髋部爆发，不用手臂硬拉。', 'SWING', 5, 15, 45),
      ex('burpee', '波比跳', '体能', 'cardio', '无器械', '落地缓冲，起跳快速。', 'BURP', 4, 10, 45),
    ],
    cardio: { type: '跑步机间歇', duration: 20, intensity: '1分钟快跑 + 1分钟慢走' },
    stretch: [stretch('calf', '小腿拉伸', 2), stretch('hamstring', '腘绳肌拉伸', 2), stretch('child-pose', '婴儿式呼吸', 2)],
    calorieRate: 7.5,
  }
}

function bikeIntervals() {
  return {
    title: '心肺耐力',
    focus: 'cardio',
    warmup: [warm('bike-easy', '单车热身', 6), warm('hip-circle', '髋关节环绕', 2)],
    strength: [
      ex('thruster', '哑铃推举深蹲', '体能', 'push', '哑铃', '深蹲起身后顺势上推。', 'THR', 4, 12, 60),
      ex('mountain-climber', '登山跑', '体能', 'cardio', '无器械', '肩在手腕上方，膝盖快速交替。', 'FAST', 5, 40, 40, { repLabel: '秒', timed: true }),
      ex('plank', '平板支撑', '核心', 'core', '瑜伽垫', '身体成直线，保持核心张力。', 'PLANK', 3, 45, 45, { repLabel: '秒', timed: true }),
    ],
    cardio: { type: '动感单车区间', duration: 25, intensity: '4分钟稳态 + 1分钟冲刺循环' },
    stretch: [stretch('quad', '股四头肌拉伸', 2), stretch('hip-flexor', '髋屈肌拉伸', 2), stretch('chest-open', '胸肩打开', 2)],
    calorieRate: 7.4,
  }
}

function ropeCore() {
  return {
    title: '绳索核心',
    focus: 'core',
    warmup: [warm('row-easy', '划船机轻划', 5), warm('dead-bug', '死虫激活', 3)],
    strength: [
      ex('pallof-press', '抗旋推胸', '核心', 'core', '绳索 / 弹力带', '骨盆稳定，双手向前推出。', 'ANTI', 4, 12, 60),
      ex('woodchop', '绳索伐木', '核心', 'core', '绳索器械', '髋肩协同旋转，控制回放。', 'CHOP', 3, 12, 60),
      ex('battle-rope', '战绳间歇', '体能', 'cardio', '战绳', '保持节奏和呼吸。', 'HIIT', 6, 25, 30, { repLabel: '秒', timed: true }),
    ],
    cardio: { type: '椭圆机节奏', duration: 18, intensity: '3分钟中速 + 1分钟快速' },
    stretch: [stretch('child-pose', '婴儿式呼吸', 3), stretch('side-bend', '体侧拉伸', 2)],
    calorieRate: 7.0,
  }
}

function mixedEndurance() {
  return {
    title: '混合耐力',
    focus: 'cardio',
    warmup: [warm('walk', '快走热身', 5), warm('mobility', '全身动态活动', 4)],
    strength: [
      ex('sled-push', '雪橇推', '体能', 'legs', '雪橇', '身体前倾，腿部持续蹬地。', 'SLED', 5, 20, 60, { repLabel: '米' }),
      ex('medicine-ball-slam', '药球砸地', '体能', 'cardio', '药球', '举过头顶后向地面爆发砸下。', 'SLAM', 4, 12, 45),
      ex('farmer-carry', '农夫走', '核心', 'core', '哑铃 / 壶铃', '身体不左右晃，步伐稳定。', 'CARRY', 4, 40, 60, { repLabel: '米' }),
    ],
    cardio: { type: '楼梯机区间', duration: 20, intensity: '2分钟中速 + 30秒快速循环' },
    stretch: [stretch('hamstring', '腘绳肌拉伸', 2), stretch('calf', '小腿拉伸', 2), stretch('child-pose', '婴儿式呼吸', 2)],
    calorieRate: 7.3,
  }
}

function shapeBalance() {
  return {
    title: '综合塑形',
    focus: 'shape',
    warmup: [warm('walk', '快走热身', 5), warm('hip-circle', '髋关节环绕', 2), warm('band-pull', '弹力带拉开', 2)],
    strength: [
      ex('push-up', '俯卧撑', '胸部', 'push', '无器械', '身体保持直线，胸口靠近地面。', 'BODY', 3, 12, 60),
      ex('goblet-squat', '高脚杯深蹲', '腿臀', 'legs', '哑铃 / 壶铃', '胸口打开，深蹲稳定。', 'LEG', 3, 12, 60),
      ex('seated-row', '坐姿划船', '背部', 'pull', '坐姿划船机', '拉向下肋位置。', 'ROW', 3, 12, 60),
      ex('plank', '平板支撑', '核心', 'core', '瑜伽垫', '保持身体成直线。', 'PLANK', 3, 40, 45, { repLabel: '秒', timed: true }),
    ],
    cardio: { type: '动感单车', duration: 18, intensity: '中等强度，保持稳定踏频' },
    stretch: [stretch('chest-open', '胸肩打开', 2), stretch('lat', '背阔肌拉伸', 2), stretch('hamstring', '腘绳肌拉伸', 2)],
    calorieRate: 6.3,
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}
