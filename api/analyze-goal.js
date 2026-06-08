import { analyzeWithProvider, hasAiProvider } from '../server/aiProvider.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    if (!hasAiProvider(process.env)) {
      res.status(503).json({ error: 'ai_provider_not_configured' })
      return
    }
    res.status(200).json(await analyzeWithProvider(process.env, body))
  } catch (error) {
    res.status(500).json({ error: error.message || 'analyze_failed' })
  }
}
