import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Recorder } from '../components/Recorder'
import { AudioButton, Avatar, BigButton, ConfirmButton, Empty, MediaImage, PhotoPicker, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { contactsOf, findSeniorByCode, formatTime, friendsOf, markMissionIfMatches, putMedia, supportersOf, uid, unreadFrom, useMe, userById, useStore } from '../store'
import { QUICK_REPLIES, STAMPS } from '../seed'
import type { Message, User } from '../types'

export function Connections() {
  const { state } = useStore()
  const me = useMe()!
  const friends = me.kind === 'senior' ? friendsOf(state, me.id) : []
  const supporters = me.kind === 'senior' ? supportersOf(state, me.id) : []
  const contacts = contactsOf(state, me)
  const pendingOut = state.friendships.filter((f) => f.fromId === me.id && f.status === 'pending')

  const row = (u: User, sub?: string) => {
    const n = unreadFrom(state, me.id, u.id).length
    const last = [...state.messages].reverse().find((m) => (m.fromId === u.id && m.toId === me.id) || (m.fromId === me.id && m.toId === u.id))
    return (
      <button key={u.id} className="list-row" onClick={() => go(`/chat/${u.id}`)}>
        <Avatar user={u} />
        <div className="list-row-main">
          <div className="list-row-title">{u.callName}</div>
          <div className="muted small">{n ? `💬 ${n}件の新しいメッセージ` : last ? preview(last) : sub}</div>
        </div>
        {!!n && <span className="badge static">{n}</span>}
      </button>
    )
  }

  return (
    <Screen title={me.kind === 'senior' ? 'つながり' : 'メッセージ'}>
      {me.kind === 'senior' ? (
        <>
          <h3 className="section-title">友達</h3>
          {friends.length ? friends.map((u) => row(u, '友達')) : <Empty emoji="🌷">まだ友達はいません。</Empty>}
          {pendingOut.map((f) => (
            <p key={f.id} className="muted small">
              ⏳ {userById(state, f.toId)?.callName}に友達申請中です
            </p>
          ))}
          <BigButton onClick={() => go('/friends/add')}>🤝 友達を追加する</BigButton>

          <h3 className="section-title">家族・サポーター</h3>
          {supporters.length ? supporters.map(({ user, rel }) => row(user, rel.label)) : <p className="muted">まだいません。下の招待コードを家族に伝えてください。</p>}
          <div className="invite-box">
            <div className="muted small">家族・サポーター招待コード</div>
            <div className="code">{me.inviteCode}</div>
          </div>
        </>
      ) : contacts.length ? (
        contacts.map((u) => row(u, '本人'))
      ) : (
        <Empty emoji="🤝">まだつながっている人はいません。</Empty>
      )}
    </Screen>
  )
}

function preview(m: Message) {
  if (m.stamp) return `スタンプ ${m.stamp}`
  if (m.audioMediaId) return '🎤 声のメッセージ'
  if (m.imageMediaId) return '📷 写真'
  return (m.text ?? '').slice(0, 24)
}

export function AddFriend() {
  const { state, update } = useStore()
  const me = useMe()!
  const [code, setCode] = useState('')
  const [qr, setQr] = useState<string>()
  useEffect(() => {
    QRCode.toDataURL(`hidamari://friend/${me.inviteCode}`, { margin: 1, width: 360, color: { dark: '#3d4a3f', light: '#fffdf8' } }).then(setQr)
  }, [me.inviteCode])

  const send = () => {
    const target = findSeniorByCode(state, code)
    if (!target || target.id === me.id) return toast('コードが見つかりませんでした。もう一度たしかめてください。')
    const exists = state.friendships.find((f) => (f.fromId === me.id && f.toId === target.id) || (f.fromId === target.id && f.toId === me.id))
    if (exists?.status === 'accepted') return toast(`${target.callName}とはもう友達です`)
    if (exists?.status === 'blocked') return toast('この方とは友達になれません')
    if (exists) return toast('もう申請しています')
    update((d) => {
      d.friendships.push({ id: uid('fr'), fromId: me.id, toId: target.id, status: 'pending', createdAt: Date.now() })
    })
    toast(`${target.callName}に友達申請を送りました`)
    go('/connections')
  }

  return (
    <Screen title="友達を追加する" backTo="/connections" nav={false}>
      <p className="muted">知っている人とだけつながれます。知らない人からは届きません。</p>
      <div className="invite-box">
        <div className="muted small">わたしの友達コード</div>
        {qr && <img className="qr" src={qr} alt="QRコード" />}
        <div className="code">{me.inviteCode}</div>
        <div className="muted small">相手にこのコードを見せてください</div>
      </div>
      <label className="field">
        <span>相手の友達コードを入れる</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例：TAKE-3926" autoCapitalize="characters" />
      </label>
      <BigButton disabled={!code.trim()} onClick={send}>
        🤝 友達申請を送る
      </BigButton>
      <p className="muted small center">
        デモ用コード:{' '}
        {state.users
          .filter((u) => u.kind === 'senior' && u.id !== me.id)
          .map((u) => `${u.callName} ${u.inviteCode}`)
          .join(' / ')}
      </p>
      <p className="muted small center">将来: QR読み取り／サポーターや施設スタッフによる追加／同じ施設の人から選ぶ</p>
    </Screen>
  )
}

export function Chat({ id }: { id: string }) {
  const { state, update } = useStore()
  const me = useMe()!
  const other = userById(state, id)
  const [mode, setMode] = useState<'view' | 'reply' | 'voice' | 'text' | 'settings'>('view')
  const [text, setText] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const thread = state.messages.filter((m) => (m.fromId === me.id && m.toId === id) || (m.fromId === id && m.toId === me.id))
  const isFriend = state.friendships.find((f) => ((f.fromId === me.id && f.toId === id) || (f.fromId === id && f.toId === me.id)))

  // 開いたら既読
  useEffect(() => {
    if (thread.some((m) => m.toId === me.id && !m.readAt))
      update((d) => {
        d.messages.forEach((m) => {
          if (m.toId === me.id && m.fromId === id && !m.readAt) m.readAt = Date.now()
        })
      })
  }, [thread.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, mode])

  if (!other) return <Screen backTo="/connections">見つかりませんでした。</Screen>
  if (isFriend?.status === 'blocked')
    return (
      <Screen backTo="/connections" title={other.callName}>
        <Empty emoji="🚫">この方とはやりとりできません。</Empty>
      </Screen>
    )

  const send = (m: Partial<Message>) => {
    update((d) => {
      d.messages.push({ id: uid('msg'), fromId: me.id, toId: id, createdAt: Date.now(), ...m })
      if (me.kind === 'senior') markMissionIfMatches(d, me.id, 'message')
    })
    setMode('view')
    setText('')
    toast(`${other.callName}に送りました`)
  }

  return (
    <Screen
      title={other.callName}
      backTo="/connections"
      nav={false}
      right={
        isFriend ? (
          <button className="icon-text" onClick={() => setMode(mode === 'settings' ? 'view' : 'settings')}>
            ⚙️ 設定
          </button>
        ) : undefined
      }
    >
      {mode === 'settings' && isFriend && (
        <div className="settings-box">
          <ConfirmButton
            confirmLabel={`${other.callName}と友達をやめますか？`}
            onConfirm={() => {
              update((d) => {
                d.friendships = d.friendships.filter((f) => f.id !== isFriend.id)
              })
              go('/connections')
            }}
          >
            友達をやめる
          </ConfirmButton>
          <ConfirmButton
            confirmLabel={`${other.callName}をブロックしますか？メッセージが届かなくなります。`}
            onConfirm={() => {
              update((d) => {
                const f = d.friendships.find((x) => x.id === isFriend.id)!
                f.status = 'blocked'
                f.blockedBy = me.id
              })
              go('/connections')
            }}
          >
            ブロックする
          </ConfirmButton>
          <ConfirmButton
            confirmLabel="運営に知らせますか？（相手には伝わりません）"
            onConfirm={() => {
              update((d) => {
                d.reports.push({ id: uid('rep'), reporterId: me.id, targetId: id, createdAt: Date.now() })
              })
              setMode('view')
              toast('運営に知らせました')
            }}
          >
            困ったことを運営に知らせる
          </ConfirmButton>
        </div>
      )}

      <div className="thread">
        {thread.length === 0 && <Empty emoji="💌">まだメッセージはありません。最初のひとことを送ってみましょう。</Empty>}
        {thread.map((m) => (
          <Bubble key={m.id} m={m} mine={m.fromId === me.id} senderName={m.fromId === me.id ? 'あなた' : other.callName} />
        ))}
        <div ref={bottom} />
      </div>

      <div className="reply-area">
        {mode === 'view' || mode === 'settings' ? (
          <BigButton onClick={() => setMode('reply')}>💬 {thread.length ? '返事をする' : 'メッセージを送る'}</BigButton>
        ) : mode === 'reply' ? (
          <>
            <BigButton onClick={() => setMode('voice')}>🎤 話して返事する</BigButton>
            <div className="label">ひとことで返す</div>
            <div className="quick-replies">
              {QUICK_REPLIES.map((q) => (
                <button key={q} className="chip big-chip" onClick={() => send({ text: q })}>
                  {q}
                </button>
              ))}
            </div>
            <div className="label">スタンプ</div>
            <div className="stamps">
              {STAMPS.map((s) => (
                <button key={s} className="stamp-btn" onClick={() => send({ stamp: s })} aria-label={`スタンプ ${s}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="row">
              <PhotoPicker variant="secondary" label="📷 写真を送る" onPicked={async (b) => send({ imageMediaId: await putMedia(b) })} />
              <BigButton variant="secondary" onClick={() => setMode('text')}>
                ⌨️ 文字で書く
              </BigButton>
            </div>
            <BigButton variant="ghost" onClick={() => setMode('view')}>
              やめる
            </BigButton>
          </>
        ) : mode === 'voice' ? (
          <>
            <Recorder startLabel="🎤 話して返事する" saveLabel="✓ 送る" onSave={async ({ blob, transcript }) => send({ audioMediaId: await putMedia(blob), transcript })} />
            <BigButton variant="ghost" onClick={() => setMode('reply')}>
              やめる
            </BigButton>
          </>
        ) : (
          <>
            <textarea className="msg-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="メッセージ" autoFocus />
            <div className="row">
              <BigButton variant="secondary" onClick={() => setMode('reply')}>
                やめる
              </BigButton>
              <BigButton disabled={!text.trim()} onClick={() => send({ text: text.trim() })}>
                ✓ 送る
              </BigButton>
            </div>
          </>
        )}
      </div>
    </Screen>
  )
}

function Bubble({ m, mine, senderName }: { m: Message; mine: boolean; senderName: string }) {
  return (
    <div className={`bubble-wrap ${mine ? 'mine' : ''}`}>
      <div className="bubble-meta">
        {senderName}・{formatTime(m.createdAt)}
      </div>
      <div className={`bubble ${m.stamp ? 'stamp' : ''}`}>
        {m.stamp && <span className="stamp-big">{m.stamp}</span>}
        {m.text && <p>{m.text}</p>}
        {m.imageMediaId && <MediaImage id={m.imageMediaId} className="bubble-img" />}
        {m.audioMediaId && (
          <>
            <AudioButton mediaId={m.audioMediaId} label={mine ? '▶ 自分の声を聞く' : `▶ ${senderName}の声を聞く`} />
            {m.transcript && <p className="bubble-transcript">「{m.transcript}」</p>}
          </>
        )}
      </div>
    </div>
  )
}
