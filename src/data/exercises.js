export const weekDays = [
  { key: 'mon', label: '周一', offset: 0 },
  { key: 'tue', label: '周二', offset: 1 },
  { key: 'wed', label: '周三', offset: 2 },
  { key: 'thu', label: '周四', offset: 3 },
  { key: 'fri', label: '周五', offset: 4 },
  { key: 'sat', label: '周六', offset: 5 },
  { key: 'sun', label: '周日', offset: 6 },
]

export const exerciseCategories = [
  { id: 'all', label: '全部' },
  { id: 'legs', label: '练腿臀' },
  { id: 'chest', label: '练胸' },
  { id: 'back', label: '练背' },
  { id: 'shoulders', label: '练肩' },
  { id: 'arms', label: '练手臂' },
  { id: 'core', label: '练核心' },
  { id: 'cardio', label: '练体能' },
]

const customExercises = [
  customExercise('custom-legs', '练腿臀'),
  customExercise('custom-chest', '练胸'),
  customExercise('custom-back', '练背'),
  customExercise('custom-shoulders', '练肩'),
  customExercise('custom-arms', '练手臂'),
  customExercise('custom-core', '练核心'),
  customExercise('custom-cardio', '练体能', { timed: true, reps: 45, rest: 45 }),
]

const gymExercises = [
  ex('squat', '杠铃深蹲', '练腿臀', 'legs', '深蹲架 / 杠铃', '脚跟踩稳，膝盖跟随脚尖方向，下蹲到大腿接近平行。', 'LEG', 4, 8, 90),
  ex('hack-squat', '哈克深蹲机', '练腿臀', 'legs', '哈克深蹲机', '背部贴稳靠垫，脚掌踩稳平台，控制下蹲深度后用腿推起。', 'HACK', 4, 10, 90),
  ex('leg-press', '腿举', '练腿臀', 'legs', '腿举机', '脚掌踩稳平台，膝盖不要内扣，控制下放后推起。', 'PRS', 4, 10, 90),
  ex('wide-stance-leg-press', '侧蹬机宽距', '练腿臀', 'legs', '侧蹬机 / 腿举机', '双脚站距略宽，脚尖微外展，推起时重点感受臀腿外侧发力。', 'WPRS', 4, 12, 90),
  ex('goblet-squat', '高脚杯深蹲', '练腿臀', 'legs', '哑铃 / 壶铃', '双手抱住重量，胸口打开，下蹲时保持躯干稳定。', 'SQT', 3, 12, 75),
  ex('smith-squat', '史密斯深蹲', '练腿臀', 'legs', '史密斯机', '双脚略向前站，控制下蹲轨迹，保持膝盖跟随脚尖方向。', 'SMT', 4, 10, 90),
  ex('bulgarian-split-squat', '保加利亚分腿蹲', '练腿臀', 'legs', '训练凳 / 哑铃', '前脚踩稳，身体垂直下降，重点感受前侧腿和臀部发力。', 'BSS', 3, 10, 75),
  ex('walking-lunge', '行走弓步', '练腿臀', 'legs', '哑铃 / 无器械', '向前跨步后控制重心，下蹲到前腿稳定再起身换腿。', 'LNG', 3, 12, 75),
  ex('romanian-deadlift', '罗马尼亚硬拉', '练腿臀', 'legs', '杠铃 / 哑铃', '髋部向后折叠，背部保持自然直线，感受大腿后侧拉长。', 'RDL', 3, 10, 90),
  ex('lying-leg-curl', '俯身腿弯曲', '练腿臀', 'legs', '俯卧腿弯举机', '骨盆贴稳垫面，弯曲膝盖时收紧大腿后侧，慢速还原。', 'HAM', 3, 12, 60),
  ex('seated-leg-curl', '坐姿腿弯举', '练腿臀', 'legs', '坐姿腿弯举机', '大腿固定在垫面下，向后弯曲膝盖，顶峰收紧腘绳肌。', 'SCUR', 3, 12, 60),
  ex('leg-extension', '坐姿腿屈伸', '练腿臀', 'legs', '腿屈伸机', '膝关节对齐机器轴心，伸直时收紧股四头肌，避免猛踢。', 'EXT', 3, 12, 60),
  ex('hip-thrust', '臀推', '练腿臀', 'legs', '臀推凳 / 杠铃', '下巴微收，顶峰夹臀，避免腰椎过度反弓。', 'HIP', 4, 10, 90),
  ex('glute-kickback-machine', '臀腿后踢机', '练腿臀', 'legs', '臀腿后踢机', '骨盆稳定，脚向后上方推，顶峰夹臀后控制回到起点。', 'KICK', 3, 12, 60),
  ex('cable-kickback', '绳索后踢腿', '练腿臀', 'legs', '龙门架 / 脚踝绑带', '身体微前倾，髋部发力向后踢，不要用腰代偿。', 'CBK', 3, 15, 45),
  ex('hip-abduction', '坐姿髋外展', '练腿臀', 'legs', '髋外展机', '背部贴稳，双腿向外打开，顶峰停顿感受臀中肌。', 'ABD', 3, 15, 45),
  ex('hip-adduction', '坐姿髋内收', '练腿臀', 'legs', '髋内收机', '大腿内侧主动夹合，慢速还原，避免靠惯性甩动。', 'ADD', 3, 15, 45),
  ex('standing-calf-raise', '站姿提踵', '练腿臀', 'legs', '提踵机 / 哑铃', '脚踝充分下沉再抬高，顶峰短暂停留，避免弹震。', 'CALF', 4, 15, 45),
  ex('seated-calf-raise', '坐姿提踵', '练腿臀', 'legs', '坐姿提踵机', '前脚掌踩稳，脚跟下沉后抬起，重点训练小腿比目鱼肌。', 'SCALF', 4, 15, 45),

  ex('bench-press', '杠铃卧推', '练胸', 'chest', '杠铃 / 卧推架', '肩胛收紧，杠铃落到胸中下部，推起时保持手腕中立。', 'BP', 4, 8, 90),
  ex('incline-db-press', '上斜哑铃卧推', '练胸', 'chest', '上斜凳 / 哑铃', '凳面约30度，哑铃下放到胸上侧，推起时不要耸肩。', 'INC', 3, 10, 75),
  ex('flat-db-press', '平板哑铃卧推', '练胸', 'chest', '平板凳 / 哑铃', '哑铃下放到胸侧，推起时胸部收紧，手腕保持中立。', 'DBP', 3, 10, 75),
  ex('smith-bench-press', '史密斯卧推', '练胸', 'chest', '史密斯机 / 平板凳', '调整凳位让杠铃落在胸中下部，保持肩胛稳定。', 'SMBP', 4, 10, 90),
  ex('chest-press-machine', '坐姿推胸', '练胸', 'chest', '推胸机', '背部贴稳靠垫，手柄推到手臂接近伸直，胸部主动收缩。', 'CP', 3, 12, 75),
  ex('incline-chest-press-machine', '上斜推胸机', '练胸', 'chest', '上斜推胸机', '手柄高度对齐胸上侧，推起时保持肩部下沉稳定。', 'ICP', 3, 12, 75),
  ex('pec-deck-fly', '蝴蝶机夹胸', '练胸', 'chest', '蝴蝶机', '胸口打开，手臂向中线夹合，顶峰挤压胸肌。', 'PEC', 3, 12, 60),
  ex('cable-fly', '绳索夹胸', '练胸', 'chest', '龙门架', '手臂微屈固定角度，向前合拢时挤压胸肌，不要甩动。', 'FLY', 3, 12, 60),
  ex('low-cable-fly', '低位绳索夹胸', '练胸', 'chest', '龙门架', '从低位向上夹合，重点感受上胸收缩，肩部不要上耸。', 'LFLY', 3, 12, 60),
  ex('dumbbell-fly', '哑铃飞鸟', '练胸', 'chest', '平板凳 / 哑铃', '手肘微屈，像抱圆一样打开和合拢，控制肩部压力。', 'DFLY', 3, 12, 60),
  ex('push-up', '俯卧撑', '练胸', 'chest', '无器械', '身体保持直线，胸口靠近地面后推起，肘部约45度打开。', 'PUSH', 3, 12, 60),
  ex('dip-chest', '双杠臂屈伸', '练胸', 'chest', '双杠 / 辅助双杠机', '身体略前倾，下降时胸部拉伸，推起时胸和三头共同发力。', 'DIP', 3, 8, 75),

  ex('lat-pulldown', '高位下拉', '练背', 'back', '高位下拉机', '背部挺直，肩胛先下沉，再把把手拉到锁骨前方。', 'PULL', 4, 10, 75),
  ex('wide-grip-pulldown', '宽握高位下拉', '练背', 'back', '高位下拉机', '宽握把手向胸前下拉，保持胸口打开，重点感受背阔肌。', 'WPULL', 4, 10, 75),
  ex('close-grip-pulldown', '窄握高位下拉', '练背', 'back', '高位下拉机 / V把', '窄握把手拉向上胸，肘部贴近身体，顶峰收紧背部。', 'CGP', 3, 12, 75),
  ex('pull-up', '引体向上', '练背', 'back', '单杠 / 辅助引体机', '先下沉肩胛，再把胸口拉向杠，下降时保持控制。', 'PU', 3, 6, 90),
  ex('assisted-pull-up', '辅助引体向上', '练背', 'back', '辅助引体机', '膝盖跪稳辅助垫，控制身体上拉和下降，避免耸肩。', 'APU', 3, 8, 75),
  ex('seated-row', '坐姿划船', '练背', 'back', '坐姿划船机 / 绳索', '胸口打开，拉向下肋位置，顶峰收紧背部，不要耸肩借力。', 'ROW', 3, 12, 75),
  ex('machine-row', '器械划船', '练背', 'back', '坐姿划船器械', '胸垫贴稳，肘部向后拉，重点感受中背收缩。', 'MROW', 3, 12, 75),
  ex('one-arm-db-row', '单臂哑铃划船', '练背', 'back', '哑铃 / 训练凳', '躯干稳定，肘部贴近身体向后拉，感受背阔肌收缩。', '1ROW', 3, 10, 75),
  ex('barbell-row', '俯身杠铃划船', '练背', 'back', '杠铃', '髋部后折保持背部平直，把杠铃拉向下腹位置。', 'BBR', 3, 8, 90),
  ex('t-bar-row', 'T杠划船', '练背', 'back', 'T杠划船机', '胸口打开，把手柄拉向腹部，顶峰收紧中背。', 'TBAR', 4, 10, 90),
  ex('straight-arm-pulldown', '直臂下压', '练背', 'back', '龙门架 / 直杆', '手臂微屈固定，向大腿方向下压，感受背阔肌发力。', 'SAP', 3, 12, 60),
  ex('face-pull', '绳索面拉', '练背', 'back', '龙门架 / 绳索', '拉向眉眼高度，肘部打开，重点训练后束和肩胛稳定。', 'FACE', 3, 15, 60),
  ex('back-extension', '罗马椅挺身', '练背', 'back', '罗马椅', '髋部折叠下放，臀背发力抬起到身体成直线。', 'EXT', 3, 12, 60),

  ex('shoulder-press', '哑铃肩推', '练肩', 'shoulders', '哑铃', '肘在身体两侧略前方，向上推至手臂接近伸直，核心收紧。', 'DBP', 3, 10, 75),
  ex('machine-shoulder-press', '肩推机', '练肩', 'shoulders', '肩推机', '背部贴稳靠垫，手柄向上推，保持肩部下沉。', 'MSP', 4, 10, 75),
  ex('barbell-overhead-press', '杠铃推举', '练肩', 'shoulders', '杠铃', '核心和臀部收紧，杠铃沿身体中线向上推，不要后仰借力。', 'OHP', 4, 6, 90),
  ex('smith-shoulder-press', '史密斯肩推', '练肩', 'shoulders', '史密斯机 / 训练凳', '坐姿稳定，杠铃沿固定轨迹推起，避免腰背代偿。', 'SMSP', 3, 10, 75),
  ex('lateral-raise', '哑铃侧平举', '练肩', 'shoulders', '哑铃', '手肘微屈，抬到肩高附近，慢速下放保持张力。', 'LAT', 3, 15, 45),
  ex('cable-lateral-raise', '绳索侧平举', '练肩', 'shoulders', '龙门架 / 单手柄', '身体微侧站，手臂向外抬起，保持肩中束持续张力。', 'CLAT', 3, 15, 45),
  ex('front-raise', '哑铃前平举', '练肩', 'shoulders', '哑铃', '手臂向前抬到肩高，控制下放，避免身体后仰。', 'FRT', 3, 12, 45),
  ex('rear-delt-fly', '俯身反向飞鸟', '练肩', 'shoulders', '哑铃 / 反向飞鸟机', '身体前倾稳定，向两侧打开手臂，重点感受肩后束。', 'RDF', 3, 15, 45),
  ex('reverse-pec-deck', '反向蝴蝶机', '练肩', 'shoulders', '反向蝴蝶机', '胸口贴稳垫面，手臂向两侧打开，收紧肩后束。', 'RPD', 3, 15, 45),
  ex('upright-row', '绳索直立划船', '练肩', 'shoulders', '龙门架 / 绳索', '把手拉到胸前高度，肘部向外上方走，肩部发力不要耸肩。', 'UPR', 3, 12, 60),
  ex('shrug', '哑铃耸肩', '练肩', 'shoulders', '哑铃 / 杠铃', '肩膀向上提起，顶峰停顿，慢速下放训练斜方肌。', 'SHR', 3, 12, 60),

  ex('db-curl', '哑铃弯举', '练手臂', 'arms', '哑铃', '上臂贴近身体，弯举时不要甩动，顶峰收紧肱二头肌。', 'BIC', 3, 12, 60),
  ex('barbell-curl', '杠铃弯举', '练手臂', 'arms', '杠铃 / EZ杆', '上臂固定，杠铃向上弯举，保持手腕稳定。', 'BBC', 3, 10, 60),
  ex('preacher-curl', '牧师凳弯举', '练手臂', 'arms', '牧师凳 / EZ杆', '上臂贴稳斜板，慢速弯举和下放，避免借力。', 'PRE', 3, 12, 60),
  ex('cable-curl', '绳索弯举', '练手臂', 'arms', '龙门架 / 直杆', '手肘固定在身体两侧，向上弯举，保持绳索张力。', 'CC', 3, 12, 60),
  ex('hammer-curl', '锤式弯举', '练手臂', 'arms', '哑铃', '掌心相对向上弯举，保持手腕中立，前臂和肱肌共同发力。', 'HAM', 3, 12, 60),
  ex('cable-triceps-pushdown', '绳索下压', '练手臂', 'arms', '龙门架 / 绳索', '上臂固定在身体两侧，向下伸直手臂时收紧肱三头肌。', 'TRI', 3, 12, 60),
  ex('straight-bar-pushdown', '直杆下压', '练手臂', 'arms', '龙门架 / 直杆', '手肘夹紧身体，向下压到手臂伸直，顶峰收紧三头肌。', 'SBP', 3, 12, 60),
  ex('overhead-triceps-extension', '过顶臂屈伸', '练手臂', 'arms', '哑铃 / 绳索', '上臂尽量固定，屈肘下放后伸直，感受肱三头长头拉伸。', 'OHT', 3, 12, 60),
  ex('skull-crusher', '仰卧臂屈伸', '练手臂', 'arms', 'EZ杆 / 哑铃', '上臂保持稳定，向额头方向屈肘下放后伸直。', 'SKL', 3, 10, 60),
  ex('bench-dip', '凳上臂屈伸', '练手臂', 'arms', '训练凳 / 无器械', '手撑凳边，身体下放后推起，肩部不适时减少幅度。', 'BDIP', 3, 12, 60),

  ex('plank', '平板支撑', '练核心', 'core', '瑜伽垫 / 无器械', '肋骨内收，骨盆微后倾，保持身体成直线。全程自然呼吸，避免塌腰。', 'PLK', 3, 45, 45, true, '秒'),
  ex('cable-crunch', '绳索卷腹', '练核心', 'core', '绳索器械', '用腹部卷曲脊柱，手只是固定绳索，不要靠手臂下拉。', 'CORE', 3, 12, 60),
  ex('machine-crunch', '卷腹机', '练核心', 'core', '卷腹机', '胸椎向前卷曲，腹部发力带动动作，不要用手硬拉。', 'MABS', 3, 12, 60),
  ex('leg-raise', '悬垂举腿', '练核心', 'core', '单杠 / 罗马椅', '骨盆向上卷起，控制下放，不摆动身体，优先感受下腹发力。', 'ABS', 3, 10, 60),
  ex('captain-chair-raise', '罗马椅举腿', '练核心', 'core', '罗马椅', '背部贴稳，骨盆向上卷，避免只抬大腿。', 'CHAIR', 3, 12, 60),
  ex('dead-bug', '死虫', '练核心', 'core', '瑜伽垫 / 无器械', '腰背贴地，四肢交替伸展，保持腹部张力。', 'BUG', 3, 12, 45),
  ex('russian-twist', '俄罗斯转体', '练核心', 'core', '药球 / 哑铃', '躯干左右旋转，骨盆保持稳定，不要只甩手臂。', 'TWS', 3, 20, 45),
  ex('pallof-press', '抗旋推', '练核心', 'core', '龙门架 / 弹力带', '身体侧对阻力，把手向前推出，抵抗身体被拉转。', 'PAL', 3, 12, 45),
  ex('side-plank', '侧平板支撑', '练核心', 'core', '瑜伽垫 / 无器械', '身体侧向成直线，骨盆抬高，保持腹斜肌发力。', 'SPLK', 3, 30, 45, true, '秒'),

  ex('battle-rope', '战绳间歇', '练体能', 'cardio', '战绳', '核心收紧，双臂交替发力，保持呼吸节奏。', 'HIIT', 6, 30, 30, true, '秒'),
  ex('burpee', '波比跳', '练体能', 'cardio', '无器械', '下蹲撑地、后跳、俯卧撑、收腿跳起连贯完成，保持节奏。', 'BUR', 5, 30, 30, true, '秒'),
  ex('rowing-interval', '划船机间歇', '练体能', 'cardio', '划船机', '腿部先蹬，再带动躯干和手臂，回程时顺序相反。', 'ROW', 6, 45, 30, true, '秒'),
  ex('kettlebell-swing', '壶铃摆动', '练体能', 'cardio', '壶铃', '髋部发力把壶铃摆出，不用手臂硬抬，背部保持稳定。', 'SWG', 4, 20, 60),
  ex('ski-erg', '滑雪机间歇', '练体能', 'cardio', '滑雪机', '核心收紧，手臂向下拉动把手，保持稳定节奏。', 'SKI', 6, 40, 30, true, '秒'),
  ex('assault-bike', '风阻车冲刺', '练体能', 'cardio', '风阻车', '手脚同步发力，短时间冲刺后充分恢复。', 'BIKE', 8, 20, 40, true, '秒'),
  ex('treadmill-incline', '跑步机坡度走', '练体能', 'cardio', '跑步机', '提高坡度稳定快走，保持心率和呼吸节奏。', 'WALK', 4, 180, 60, true, '秒'),
]

export const exerciseLibrary = [...customExercises, ...gymExercises]

export const warmupLibrary = [
  { id: 'walk', name: '跑步机快走', duration: 5, illustration: '速度逐步提高到微微出汗。' },
  { id: 'hip-circle', name: '髋关节环绕', duration: 2, illustration: '每侧顺逆时针各做一组。' },
  { id: 'band-pull', name: '弹力带拉开', duration: 2, illustration: '肩胛后缩，动作慢而可控。' },
  { id: 'dead-bug', name: '死虫激活', duration: 3, illustration: '腰背贴地，四肢交替伸展。' },
]

export const stretchLibrary = [
  { id: 'hamstring', name: '腘绳肌拉伸', duration: 2, illustration: '保持背部延展，感受大腿后侧。' },
  { id: 'chest-open', name: '胸肩打开', duration: 2, illustration: '手臂扶墙，身体缓慢转开。' },
  { id: 'lat-stretch', name: '背阔肌拉伸', duration: 2, illustration: '双手前伸，臀部向后坐。' },
  { id: 'child-pose', name: '婴儿式呼吸', duration: 3, illustration: '鼻吸口呼，降低心率。' },
]

export const cardioOptions = {
  fatloss: { type: '椭圆机间歇', duration: 22, intensity: '中高强度，2分钟快 + 1分钟慢循环' },
  muscle: { type: '坡度快走', duration: 14, intensity: '中等强度，避免影响力量恢复' },
  shape: { type: '动感单车', duration: 18, intensity: '中等强度，保持稳定踏频' },
  core: { type: '划船机', duration: 16, intensity: '核心收紧，心率维持在65%-75%' },
}

function customExercise(id, category, options = {}) {
  const muscle = id.replace('custom-', '')
  return ex(
    id,
    '自定义动作',
    category,
    muscle,
    '自选器械',
    '如果列表里没有这个动作，可以先用它占位，再在下方参数里设置组数、次数、重量和休息。',
    '自定',
    3,
    options.reps || 10,
    options.rest || 60,
    Boolean(options.timed),
    options.timed ? '秒' : undefined,
  )
}

function ex(id, name, category, muscle, equipment, illustration, image, defaultSets, defaultReps, defaultRest, timed = false, repLabel) {
  return {
    id,
    name,
    category,
    muscle,
    equipment,
    illustration,
    image,
    defaultSets,
    defaultReps,
    defaultRest,
    repLabel,
    timed,
  }
}
