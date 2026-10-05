// 音声 → 文字起こし API（Cloudflare Workers AI / Whisper large-v3-turbo）
// POST /transcribe  body: 音声ファイルそのもの（mp4 / webm など）  →  { text }
// 音声は文字起こしにだけ使い、保存しない。

const ALLOWED_ORIGINS = ['https://immirei-t.github.io', 'http://localhost:5173']
const MAX_BYTES = 15 * 1024 * 1024

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') ?? ''
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const json = (body, status = 200) => Response.json(body, { status, headers: cors })

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/transcribe') return json({ error: 'not_found' }, 404)
    // PoC 用の簡易な制限（ブラウザ以外からの呼び出しは防げない。本番では認証を付ける）
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403)

    const buf = await req.arrayBuffer()
    if (!buf.byteLength || buf.byteLength > MAX_BYTES) return json({ error: 'bad_size' }, 413)

    try {
      const result = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
        audio: toBase64(buf),
        language: 'ja',
        vad_filter: true, // 無音部分での「幻聴」テキストを減らす
      })
      return json({ text: (result.text ?? '').trim() })
    } catch (e) {
      console.error(e)
      return json({ error: 'stt_failed' }, 502)
    }
  },
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
