import { useEffect, useRef, useState, type ReactNode } from 'react'
import { back, go } from '../lib/router'
import { useMediaUrl, useMe, useStore, unreadFrom } from '../store'
import type { ID, User } from '../types'

// ---- レイアウト ----
export function Screen({
  title,
  backTo,
  children,
  nav = true,
  right,
}: {
  title?: string
  backTo?: string | true
  children: ReactNode
  nav?: boolean
  right?: ReactNode
}) {
  return (
    <div className={`screen ${nav ? 'with-nav' : ''}`}>
      {(title || backTo) && (
        <header className="topbar">
          {backTo ? (
            <button className="back" onClick={() => (backTo === true ? back() : go(backTo))}>
              ← もどる
            </button>
          ) : (
            <span />
          )}
          {title && <h1>{title}</h1>}
          <div className="topbar-right">{right}</div>
        </header>
      )}
      <main className="content">{children}</main>
      {nav && <BottomNav />}
    </div>
  )
}

export function BottomNav() {
  const me = useMe()
  const { state } = useStore()
  const hash = location.hash
  if (!me) return null
  const unread = unreadFrom(state, me.id).length
  const items =
    me.kind === 'senior'
      ? [
          { path: '/', emoji: '🏠', label: 'ホーム' },
          { path: '/memories', emoji: '📖', label: '思い出' },
          { path: '/photos', emoji: '📷', label: '写真' },
          { path: '/recipes', emoji: '🍳', label: 'レシピ' },
          { path: '/connections', emoji: '💬', label: 'つながり', badge: unread },
        ]
      : [
          { path: '/', emoji: '🏠', label: 'ホーム' },
          { path: '/memories', emoji: '📖', label: '思い出' },
          { path: '/recipes', emoji: '🍳', label: 'レシピ' },
          { path: '/connections', emoji: '💬', label: 'メッセージ', badge: unread },
        ]
  const current = '/' + (hash.replace(/^#\/?/, '').split('/')[0] ?? '')
  return (
    <nav className="bottomnav">
      {items.map((it) => (
        <button key={it.path} className={current === it.path ? 'active' : ''} onClick={() => go(it.path)}>
          <span className="nav-emoji">{it.emoji}</span>
          <span className="nav-label">{it.label}</span>
          {!!it.badge && <span className="badge">{it.badge}</span>}
        </button>
      ))}
    </nav>
  )
}

export function Card({ children, tone, onClick }: { children: ReactNode; tone?: 'sage' | 'pink' | 'blue' | 'beige'; onClick?: () => void }) {
  return (
    <section className={`card ${tone ? 'tone-' + tone : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      {children}
    </section>
  )
}

export function BigButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  return (
    <button className={`big-btn ${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Avatar({ user, size = 56 }: { user?: User; size?: number }) {
  const url = useMediaUrl(user?.avatarMediaId)
  const ch = user?.callName?.[0] ?? '?'
  const hue = user ? (user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360 : 0
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue} 40% 86%)` }}>
      {url ? <img src={url} alt="" /> : ch}
    </div>
  )
}

export function MediaImage({ id, className, alt = '' }: { id?: ID; className?: string; alt?: string }) {
  const url = useMediaUrl(id)
  if (!id) return null
  return url ? <img className={className} src={url} alt={alt} /> : <div className={`${className} img-loading`} />
}

// ---- 音声再生ボタン（大きい ▶ 聞く / ■ 止める）----
export function AudioButton({ mediaId, src, label = '▶ 聞く' }: { mediaId?: ID; src?: string; label?: string }) {
  const stored = useMediaUrl(mediaId)
  const url = src ?? stored
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  if (!mediaId && !src) return null
  return (
    <>
      <audio ref={audio} src={url} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} preload="auto" />
      <button
        className={`big-btn play ${playing ? 'playing' : ''}`}
        disabled={!url}
        onClick={() => {
          const a = audio.current
          if (!a) return
          if (playing) {
            a.pause()
            a.currentTime = 0
          } else {
            a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
          }
        }}
      >
        {playing ? '■ 止める' : label}
      </button>
    </>
  )
}

// ---- 写真選択（縮小して保存）----
export function PhotoPicker({ onPicked, label = '📷 写真をえらぶ', variant = 'primary' }: { onPicked: (blob: Blob) => void; label?: string; variant?: 'primary' | 'secondary' }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onPicked(await resizeImage(f))
          e.target.value = ''
        }}
      />
      <BigButton variant={variant} onClick={() => input.current?.click()}>
        {label}
      </BigButton>
    </>
  )
}

async function resizeImage(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1.5e6) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.86))
  } catch {
    return file
  }
}

// ---- やさしいトースト ----
let pushToast: (msg: string) => void = () => {}
export const toast = (msg: string) => pushToast(msg)
export function ToastHost() {
  const [msg, setMsg] = useState<string>()
  useEffect(() => {
    let t: number
    pushToast = (m) => {
      setMsg(m)
      window.clearTimeout(t)
      t = window.setTimeout(() => setMsg(undefined), 2600)
    }
  }, [])
  return msg ? <div className="toast">{msg}</div> : null
}

// ---- 2段階の確認ボタン（window.confirm を使わない・誤操作防止）----
export function ConfirmButton({ children, confirmLabel, onConfirm }: { children: ReactNode; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <BigButton variant="ghost" onClick={() => setAsking(true)}>
        {children}
      </BigButton>
    )
  return (
    <div className="confirm-box">
      <p>{confirmLabel}</p>
      <div className="row">
        <BigButton variant="secondary" onClick={() => setAsking(false)}>
          やめる
        </BigButton>
        <BigButton variant="danger" onClick={onConfirm}>
          はい
        </BigButton>
      </div>
    </div>
  )
}

export function Empty({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <p>{children}</p>
    </div>
  )
}
