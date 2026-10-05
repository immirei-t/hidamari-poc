import { useVoiceRecorder, liveTranscription } from '../lib/useVoiceRecorder'
import { STT_URL } from '../lib/stt'
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
          {liveTranscription && (
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
          <p className="review-title">{rec.warning ? '録音を確認してください' : '録音できました'}（{mm}:{ss}）</p>
          {rec.warning && <p className="error">{rec.warning}</p>}
          <AudioButton src={rec.url} label="▶ 聞いてみる" />
          {rec.warning ? null : rec.transcribing ? (
            <div className="transcript-preview">
              <div className="label">📝 文字にしています…</div>
              <p className="interim">少しお待ちください</p>
            </div>
          ) : STT_URL || liveTranscription ? (
            <div className="transcript-preview">
              <div className="label">文字にすると…</div>
              <p>{rec.transcript || (rec.sttFailed ? '文字にできませんでした。声は保存されます。' : 'うまく聞き取れませんでした。声は保存されます。')}</p>
            </div>
          ) : (
            <p className="hint">声はそのまま保存されます。（この端末では文字起こしが使えません。あとで家族が文字を書き足すこともできます）</p>
          )}
          <div className="row">
            <BigButton variant="secondary" onClick={rec.reset}>
              🔄 録り直す
            </BigButton>
            <BigButton disabled={saving || rec.transcribing} onClick={() => onSave({ blob: rec.blob!, transcript: rec.transcript.trim() })}>
              {saving ? '保存中…' : rec.transcribing ? '文字にしています…' : saveLabel}
            </BigButton>
          </div>
        </>
      )}

      {rec.error && <p className="error">{rec.error}</p>}
    </div>
  )
}
