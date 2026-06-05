/* global process */

import { analyzeWithProvider, generateWithProvider, hasAiProvider } from './aiProvider.js'


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
          const payload = hasAiProvider(process.env)
            ? await analyzeWithProvider(process.env, body)
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
          const payload = hasAiProvider(process.env)
            ? await generateWithProvider(process.env, body)
            : mockGenerate(body)
          sendJson(res, 200, payload)
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'generate_failed' })
        }
      })
    },
  }
}


function mockGenerate() {
  throw new Error('ai_provider_not_configured')
}

function mockAnalyze() {
  throw new Error('ai_provider_not_configured')
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
