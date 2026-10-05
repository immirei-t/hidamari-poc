import { useCallback, useEffect, useRef, useState } from 'react'

// 録音（MediaRecorder）と文字起こし（Web Speech API）を行うフック。
// PoC: 文字起こしはブラウザ内蔵の音声認識（PC の Chrome / Edge のみ。スマホは録音のみ）。
// 本番: 保存した音声をサーバー側の Speech-to-Text（Whisper / Google STT 等）で起こすのが確実。

type Phase = 'idle' | 'recording' | 'review'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any

const SpeechRecognitionCtor: AnyRecognition =
  typeof window !== 'undefined'
    ? (window as AnyRecognition).SpeechRecognition || (window as AnyRecognition).webkitSpeechRecognition
    : undefined

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
// iPadOS は Mac と名乗るのでタッチ点数で判定
const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
const isMobile = isIOS || /Android/i.test(ua)

export const speechSupported = !!SpeechRecognitionCtor
// スマホでは音声認識がマイクを占有し、同時に録音すると無音になる（iPhone Safari で確認）。
// 「本人の声を残す」を優先し、スマホでは録音のみ行う。文字起こしは本番でサーバー側 STT に置き換える。
export const liveTranscription = speechSupported && !isMobile
export const recordingSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

function pickMime() {
  // iPhone は webm を録れても再生できない場合があるため mp4 を優先
  const candidates = isIOS
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ''
}

/** 録音が無音（マイクが取れていない）かどうかを調べる。判定できないときは false */
async function isSilent(blob: Blob): Promise<boolean> {
  try {
    const Ctx = window.AudioContext || (window as AnyRecognition).webkitAudioContext
    const ctx: AudioContext = new Ctx()
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    ctx.close()
    let peak = 0
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const data = buf.getChannelData(c)
      for (let i = 0; i < data.length; i += 64) peak = Math.max(peak, Math.abs(data[i]))
    }
    return peak < 0.003
  } catch {
    return false
  }
}

export function useVoiceRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [blob, setBlob] = useState<Blob>()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [warning, setWarning] = useState<string>()

  const recorderRef = useRef<MediaRecorder>()
  const streamRef = useRef<MediaStream>()
  const recogRef = useRef<AnyRecognition>()
  const timerRef = useRef<number>()
  const activeRef = useRef(false)
  const finalRef = useRef('')

  const cleanup = useCallback(() => {
    activeRef.current = false
    window.clearInterval(timerRef.current)
    try {
      recogRef.current?.stop()
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecognition = useCallback(() => {
    if (!SpeechRecognitionCtor) return
    const r = new SpeechRecognitionCtor()
    r.lang = 'ja-JP'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e: AnyRecognition) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalRef.current += res[0].transcript + '。'
        else interimText += res[0].transcript
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }
    r.onerror = () => {
      /* 無音などで止まるのは通常。onend で再開する */
    }
    r.onend = () => {
      // Chrome は無音が続くと自動停止するので、録音中は再開する
      if (activeRef.current) {
        try {
          r.start()
        } catch {
          /* noop */
        }
      }
    }
    try {
      r.start()
      recogRef.current = r
    } catch {
      /* noop */
    }
  }, [])

  const start = useCallback(async () => {
    setError(undefined)
    if (!recordingSupported) {
      setError('この端末では録音ができません。別のブラウザでお試しください。')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        const b = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
        setBlob(b)
        setUrl(URL.createObjectURL(b))
        setPhase('review')
        isSilent(b).then((silent) => {
          if (b.size < 1000 || silent) setWarning('声が録音できていないようです。「🔄 録り直す」を押して、もう一度お試しください。')
        })
      }
      recorderRef.current = rec
      finalRef.current = ''
      setTranscript('')
      setInterim('')
      setSeconds(0)
      activeRef.current = true
      setWarning(undefined)
      // 1秒ごとにデータを受け取る（Safari で空の録音になるのを防ぐ）
      rec.start(1000)
      if (liveTranscription) startRecognition()
      setPhase('recording')
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250)
    } catch {
      setError('マイクが使えませんでした。画面の上に出る「許可」を押してから、もう一度お試しください。')
      cleanup()
    }
  }, [cleanup, startRecognition])

  const stop = useCallback(() => {
    activeRef.current = false
    window.clearInterval(timerRef.current)
    // 認識の最後の結果を拾うため、少し待ってから止める
    try {
      recogRef.current?.stop()
    } catch {
      /* noop */
    }
    recorderRef.current?.stop()
    window.setTimeout(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setInterim((last) => {
        if (last) {
          finalRef.current += last + '。'
          setTranscript(finalRef.current)
        }
        return ''
      })
    }, 400)
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setPhase('idle')
    setBlob(undefined)
    setUrl(undefined)
    setTranscript('')
    setInterim('')
    setSeconds(0)
    setWarning(undefined)
  }, [cleanup])

  return { phase, seconds, transcript, interim, blob, url, error, warning, start, stop, reset, setTranscript }
}
