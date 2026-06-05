import { generateWithProvider, hasAiProvider } from '../../server/aiProvider.js'

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    if (!hasAiProvider(env)) return json({ error: 'ai_provider_not_configured' }, 503)
    return json(await generateWithProvider(env, body))
  } catch (error) {
    return json({ error: error.message || 'generate_failed' }, 500)
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
