let mockCalories = 120

export async function connectAppleWatch() {
  await wait(450)
  return {
    connected: true,
    provider: 'MockHealthKitBridge',
    message: '已连接 Apple Watch 模拟接口',
  }
}

export async function readLatestWorkoutMetrics() {
  await wait(180)
  const heartRate = randomBetween(96, 152)
  mockCalories += randomBetween(8, 26)
  const duration = randomBetween(12, 86)
  const moveRing = Math.min(100, randomBetween(42, 96))

  return {
    heartRate,
    calories: mockCalories,
    duration,
    rings: {
      move: moveRing,
      exercise: Math.min(100, Math.round(duration / 0.6)),
      stand: randomBetween(58, 100),
    },
    sampledAt: new Date().toISOString(),
  }
}

export async function requestRealHealthKitBridge() {
  throw new Error(
    '真实 Apple Watch 数据需要 iOS/watchOS App 使用 HealthKit 授权后上传。请在这里接入后端同步接口。',
  )
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
