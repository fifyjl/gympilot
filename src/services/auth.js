const CODE_KEY_PREFIX = 'gympilot-email-code-'

export async function requestEmailCode(email) {
  const cleanEmail = normalizeEmail(email)
  if (!isValidEmail(cleanEmail)) throw new Error('请输入正确的邮箱地址')

  try {
    const response = await fetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    })
    if (response.ok) return { mode: 'email', message: '验证码已发送到邮箱，请查收。' }
  } catch {
    // Static hosting fallback below.
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  sessionStorage.setItem(codeKey(cleanEmail), JSON.stringify({
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }))
  return {
    mode: 'demo',
    code,
    message: `当前静态部署没有邮件服务，演示验证码是 ${code}。接入后端后会真实发送到邮箱。`,
  }
}

export async function verifyEmailCode(email, code) {
  const cleanEmail = normalizeEmail(email)
  const cleanCode = String(code || '').trim()
  if (!isValidEmail(cleanEmail)) throw new Error('请输入正确的邮箱地址')
  if (!/^\d{6}$/.test(cleanCode)) throw new Error('请输入 6 位验证码')

  try {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    })
    if (response.ok) return await response.json()
  } catch {
    // Static hosting fallback below.
  }

  const raw = sessionStorage.getItem(codeKey(cleanEmail))
  if (!raw) throw new Error('请先获取验证码')
  const saved = JSON.parse(raw)
  if (Date.now() > saved.expiresAt) throw new Error('验证码已过期，请重新获取')
  if (saved.code !== cleanCode) throw new Error('验证码不正确')
  sessionStorage.removeItem(codeKey(cleanEmail))
  return {
    email: cleanEmail,
    signedInAt: new Date().toISOString(),
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function codeKey(email) {
  return `${CODE_KEY_PREFIX}${email}`
}
