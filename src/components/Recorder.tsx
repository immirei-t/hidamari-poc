import { useVoiceRecorder, speechSupported } from '../lib/useVoiceRecorder'
import { AudioButton, BigButton } from './ui'

export interface RecordingResult {
  blob: Blob
  transcript: string
}

/**
 * 録音UI（要件 #9）
 *   🎤 話して答える → 録音中 ■ 終わる → ▶ 聞く / 🔄 録り直す / ✓ 保存する
 */
export function Recorder({
  startLabel = '🎤 話して答える',
  saveLabel = '✓ 保存する',
  onSave,
  compact = false,
  saving = false,
}: {
  startLabel?: string
  saveLabel?: string
  onSave: (r: RecordingResult) => void
  compact?: boolean
  saving?: boolean
}) {
  const rec = useVoiceRecorder()
  const mm = Math.floor(rec.seconds / 60)
  const ss = String(rec.seconds % 60).padStart(2, '0')

  return (
    <div className={`recorder ${compact ? 'compact' : ''}`}>
      {rec.phase === 'idle' && (
        <>
          <button className="mic-btn" onClick={rec.start}>
            <span className="mic-emoji">🎤</span>
            <span>{startLabel.replace(/^🎤\s*/, '')}</span>
          </button>
          <p className="hint">ボタンを押して、ふだん通りにお話しください。</p>
        </>
      )}

      {rec.phase === 'recording' && (
        <>
          <div className="rec-indicator">
            <span className="rec-dot" /> 録音しています　{mm}:{ss}
          </div>
          {speechSupported && (
            <div className="live-transcript" aria-live="polite">
              {rec.transcript}
              <span className="interim">{rec.interim}</span>
              {!rec.transcript && !rec.interim && <span className="interim">お話を聞いています…</span>}
            </div>
          )}
          <button className="stop-btn" onClick={rec.stop}>
            <span className="stop-square" />
            <span>終わる</span>
          </button>
        </>
      )}

      {rec.phase === 'review' && rec.blob && (
        <>
          <p className="review-title">録音できました（{mm}:{ss}）</p>
          <AudioButton src={rec.url} label="▶ 聞いてみる" />
          {speechSupported ? (
            <div className="transcript-preview">
              <div className="label">文字にすると…</div>
              <p>{rec.transcript || 'うまく聞き取れませんでした。声は保存されます。'}</p>
            </div>
          ) : (
            <p className="hint">このブラウザでは文字起こしが使えません。声はそのまま保存されます。</p>
          )}
          <div className="row">
            <BigButton variant="secondary" onClick={rec.reset}>
              🔄 録り直す
            </BigButton>
            <BigButton disabled={saving} onClick={() => onSave({ blob: rec.blob!, transcript: rec.transcript.trim() })}>
              {saving ? '保存中…' : saveLabel}
            </BigButton>
          </div>
        </>
      )}

      {rec.error && <p className="error">{rec.error}</p>}
    </div>
  )
}
