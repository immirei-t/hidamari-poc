// サーバー側の文字起こし（Cloudflare Workers AI / Whisper）。worker/ を参照。
// URL はビルド時の環境変数 VITE_STT_URL（.env.production）。未設定ならサーバー文字起こしは使わない。
export const STT_URL: string | undefined = import.meta.env.VITE_STT_URL || undefined

export async function transcribeRemote(blob: Blob, signal?: AbortSignal): Promise<string> {
  if (!STT_URL) throw new Error('stt_not_configured')
  const res = await fetch(`${STT_URL.replace(/\/$/, '')}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
    signal,
  })
  if (!res.ok) throw new Error(`stt_${res.status}`)
  const data = (await res.json()) as { text?: string }
  return data.text ?? ''
}
