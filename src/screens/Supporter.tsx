import { useState } from 'react'
import { AudioButton, Avatar, BigButton, Card, Empty, MediaImage, PhotoPicker, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { findSeniorByCode, formatTime, putMedia, supportedSeniors, uid, useActiveSenior, useMe, userById, useStore } from '../store'
import { SUPPORTER_QUESTION_IDEAS } from '../seed'

export function SupporterHome() {
  const { state, update } = useStore()
  const me = useMe()!
  const seniors = supportedSeniors(state, me.id)
  const senior = useActiveSenior()
  const pending = state.relationships.filter((r) => r.supporterId === me.id && r.status === 'pending')
  const [linking, setLinking] = useState(false)
  const [code, setCode] = useState('')

  const link = () => {
    const s = findSeniorByCode(state, code)
    if (!s) return toast('コードが見つかりませんでした')
    if (state.relationships.some((r) => r.seniorId === s.id && r.supporterId === me.id)) return toast('すでに申請済みです')
    update((d) => {
      d.relationships.push({ id: uid('rel'), seniorId: s.id, supporterId: me.id, role: 'family', label: '家族', status: 'pending', createdAt: Date.now() })
    })
    toast(`${s.callName}に承認をお願いしました`)
    setLinking(false)
    setCode('')
  }

  const linkForm = (
    <Card tone="beige">
      <label className="field">
        <span>ご本人の招待コード</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例：TAKE-3926" />
      </label>
      <BigButton disabled={!code.trim()} onClick={link}>
        承認をお願いする
      </BigButton>
    </Card>
  )

  if (!senior)
    return (
      <Screen title="サポーター">
        <h2>{me.callName}、ようこそ</h2>
        <PendingNote pending={pending.map((r) => r.seniorId)} />
        {!pending.length && <Empty emoji="🤝">支える相手とつながると、思い出を見たり、質問を送ったりできます。</Empty>}
        {linkForm}
      </Screen>
    )

  const memories = state.memories.filter((m) => m.seniorId === senior.id)
  const myQuestions = state.supporterQuestions.filter((q) => q.seniorId === senior.id && q.fromId === me.id)

  return (
    <Screen title="サポーター">
      {seniors.length > 1 && (
        <div className="senior-tabs">
          {seniors.map((s) => (
            <button key={s.id} className={`chip ${s.id === senior.id ? 'on' : ''}`} onClick={() => update((d) => { d.activeSeniorId = s.id })}>
              {s.callName}
            </button>
          ))}
        </div>
      )}
      <div className="supporter-head">
        <Avatar user={senior} size={64} />
        <div>
          <div className="muted small">サポートしている人</div>
          <h2>{senior.callName}</h2>
        </div>
      </div>

      <div className="row">
        <BigButton onClick={() => go('/send-question')}>✉️ 質問を送る</BigButton>
        <BigButton variant="secondary" onClick={() => go(`/chat/${senior.id}`)}>
          💬 メッセージ
        </BigButton>
      </div>

      <h3 className="section-title">あなたが送った質問</h3>
      {myQuestions.length === 0 && <p className="muted">まだありません。</p>}
      {myQuestions.map((q) => (
        <Card key={q.id} tone={q.answeredMemoryId ? 'sage' : undefined} onClick={q.answeredMemoryId ? () => go(`/memories/${q.answeredMemoryId}`) : undefined}>
          <div className="sq-row">
            {q.photoMediaId && <MediaImage id={q.photoMediaId} className="sq-thumb" />}
            <div>
              <p>「{q.text}」</p>
              <p className="small">{q.answeredMemoryId ? '🌸 回答が届きました → 声と文章を見る' : '⏳ 回答を待っています'}</p>
            </div>
          </div>
        </Card>
      ))}

      <h3 className="section-title">新しい思い出</h3>
      {memories.length === 0 ? (
        <p className="muted">まだ思い出はありません。</p>
      ) : (
        memories.slice(0, 5).map((m) => (
          <Card key={m.id}>
            <div className="memory-feed">
              {m.photoMediaId && <MediaImage id={m.photoMediaId} className="feed-photo" />}
              <div className="memory-card-title">{m.title}</div>
              <p className="muted small">{formatTime(m.createdAt)}</p>
              <p className="clamp">{m.transcript || '（声のみ）'}</p>
              {m.audioMediaId && <AudioButton mediaId={m.audioMediaId} label={`▶ ${senior.callName}の声を聞く`} />}
              <BigButton variant="ghost" onClick={() => go(`/memories/${m.id}`)}>
                くわしく見る
              </BigButton>
            </div>
          </Card>
        ))
      )}

      <PendingNote pending={pending.map((r) => r.seniorId)} />
      <h3 className="section-title">ほかの人をサポートする</h3>
      {linking ? linkForm : <BigButton variant="ghost" onClick={() => setLinking(true)}>➕ 招待コードで追加</BigButton>}
    </Screen>
  )
}

function PendingNote({ pending }: { pending: string[] }) {
  const { state } = useStore()
  if (!pending.length) return null
  const first = userById(state, pending[0])
  return (
    <Card tone="pink">
      <div className="card-label">⏳ 承認を待っています</div>
      {pending.map((id) => {
        const s = userById(state, id)
        return (
          <p key={id}>
            <b>{s?.callName}</b>のホームに「サポーターになりたいそうです」というお知らせが届いています。{s?.callName}が「承認する」を押すとつながります。
          </p>
        )
      })}
      <p className="small muted">デモでは、画面いちばん上の「切り替え ▾」で{first?.callName}に切り替えると、承認できます。</p>
    </Card>
  )
}

export function SendQuestion() {
  const { update } = useStore()
  const me = useMe()!
  const senior = useActiveSenior()
  const [text, setText] = useState('')
  const [photoId, setPhotoId] = useState<string>()
  if (!senior) return <Screen backTo="/">ご本人とつながっていません。</Screen>

  return (
    <Screen title="質問を送る" backTo="/" nav={false}>
      <p className="muted">{senior.callName}のホームに届きます。ご本人は話すだけで答えられます。</p>
      <div className="label">ヒント</div>
      <div className="chips">
        {SUPPORTER_QUESTION_IDEAS.map((q) => (
          <button key={q} className="chip" onClick={() => setText(q)}>
            {q}
          </button>
        ))}
      </div>
      <label className="field">
        <span>質問</span>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="例：おじいちゃんとはどこで出会ったの？" />
      </label>
      <div className="field">
        <span>写真をつける（「この写真のこと教えて」など）</span>
        {photoId && <MediaImage id={photoId} className="hero-photo" />}
        <PhotoPicker variant="secondary" label={photoId ? '📷 写真をえらびなおす' : '📷 写真を追加する'} onPicked={async (b) => setPhotoId(await putMedia(b))} />
      </div>
      <BigButton
        disabled={!text.trim()}
        onClick={() => {
          update((d) => {
            d.supporterQuestions.unshift({ id: uid('sq'), seniorId: senior.id, fromId: me.id, text: text.trim(), photoMediaId: photoId, createdAt: Date.now() })
          })
          toast(`${senior.callName}に質問を送りました`)
          go('/')
        }}
      >
        ✉️ 送る
      </BigButton>
    </Screen>
  )
}
