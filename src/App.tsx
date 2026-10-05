import { Component, useState, type ReactNode } from 'react'
import { Avatar, ToastHost } from './components/ui'
import { go, useRoute } from './lib/router'
import { useMe, useStore } from './store'
import { speechSupported } from './lib/useVoiceRecorder'
import { Signup, Welcome } from './screens/Welcome'
import { SeniorHome } from './screens/SeniorHome'
import { Answer } from './screens/Answer'
import { MemoryDetail, MemoryList } from './screens/Memories'
import { PhotoList, PhotoStory } from './screens/Photos'
import { RecipeDetail, RecipeList, RecipeNew } from './screens/Recipes'
import { Mission } from './screens/Mission'
import { AddFriend, Chat, Connections } from './screens/Connections'
import { SendQuestion, SupporterHome } from './screens/Supporter'

function Router() {
  const [a, b, c] = useRoute()
  const me = useMe()

  if (!me) return a === 'signup' ? <Signup /> : <Welcome />
  const senior = me.kind === 'senior'

  switch (a) {
    case undefined:
    case '':
      return senior ? <SeniorHome /> : <SupporterHome />
    case 'answer':
      return senior ? <Answer key={`${b}-${c}`} mode={b} id={c} /> : <SupporterHome />
    case 'memories':
      return b ? <MemoryDetail id={b} /> : <MemoryList />
    case 'photos':
      return b === 'new' && senior ? <PhotoStory /> : <PhotoList />
    case 'recipes':
      return b === 'new' && senior ? <RecipeNew /> : b ? <RecipeDetail key={b} id={b} /> : <RecipeList />
    case 'mission':
      return senior ? <Mission /> : <SupporterHome />
    case 'connections':
      return <Connections />
    case 'friends':
      return senior ? <AddFriend /> : <Connections />
    case 'chat':
      return <Chat key={b} id={b} />
    case 'send-question':
      return <SendQuestion />
    default:
      return senior ? <SeniorHome /> : <SupporterHome />
  }
}

/** 画面が真っ白にならないように（エラー文は簡単な日本語で） */
class SafeArea extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: unknown) {
    console.error(e)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="empty">
        <div className="empty-emoji">🙇</div>
        <p>うまく表示できませんでした。</p>
        <button
          className="big-btn primary"
          onClick={() => {
            this.setState({ failed: false })
            go('/')
          }}
        >
          🏠 ホームにもどる
        </button>
      </div>
    )
  }
}

/** デモ用：画面上部で「誰として見るか」を切り替える（PoC専用） */
function DemoBar() {
  const { state, update, reset } = useStore()
  const me = useMe()
  const [open, setOpen] = useState(false)
  const switchTo = (id?: string, path = '/') => {
    update((d) => {
      d.currentUserId = id
    })
    setOpen(false)
    go(id ? path : '/')
  }
  return (
    <>
      <button className="demobar" onClick={() => setOpen(!open)}>
        <span className="demo-tag">DEMO</span>
        {me ? `${me.callName}（${me.kind === 'senior' ? '本人' : 'サポーター'}）として表示中` : 'ログイン前'}
        <span className="demobar-switch">切り替え ▾</span>
      </button>
      {open && (
        <div className="demo-sheet" onClick={() => setOpen(false)}>
          <div className="demo-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <div className="small muted">誰として見る？</div>
            {state.users.map((u) => (
              <button key={u.id} className={`list-row ${u.id === me?.id ? 'on' : ''}`} onClick={() => switchTo(u.id)}>
                <Avatar user={u} size={40} />
                <div className="list-row-main">
                  <div className="list-row-title">{u.callName}</div>
                  <div className="muted small">{u.kind === 'senior' ? '本人' : 'サポーター'}</div>
                </div>
              </button>
            ))}
            <div className="row">
              <button className="big-btn ghost" onClick={() => switchTo(undefined)}>
                ログアウト
              </button>
              <button
                className="big-btn ghost"
                onClick={() => {
                  reset()
                  setOpen(false)
                }}
              >
                データを初期化
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** PC表示のときだけ横に出す「デモの歩き方」 */
function DemoGuide() {
  const { update } = useStore()
  const as = (id: string, path: string) => {
    update((d) => {
      d.currentUserId = id
    })
    go(path)
  }
  const flows = [
    { t: '① 今日の質問に声で答える', s: 'はなこさん → 「話して答える」→ 録音 → 保存 → 思い出に', run: () => as('u-hanako', '/') },
    { t: '② 写真から思い出を残す', s: 'はなこさん → 写真 → 質問4つに声で回答', run: () => as('u-hanako', '/photos/new') },
    { t: '③ サポーターが質問を送る', s: 'エリカさん → 質問を送る → はなこさんで回答 → エリカさんで声と文章を確認', run: () => as('u-erika', '/send-question') },
    { t: '④ レシピを話して残す', s: 'はなこさん → レシピ → 「どうやって作るの？」に話す', run: () => as('u-hanako', '/recipes/new') },
    { t: '⑤ 今日の役割（ミッション）', s: '日替わり。できなくてもペナルティなし。お花は枯れない', run: () => as('u-hanako', '/mission') },
    { t: '⑥ 友達にメッセージ', s: 'よしこさんからのメッセージに 🎤声 / スタンプで返事', run: () => as('u-hanako', '/chat/u-yoshiko') },
    { t: '⑦ 友達登録', s: 'はなこさん → たけしさんのコード TAKE-3926 で申請 → たけしさんで承認', run: () => as('u-hanako', '/friends/add') },
  ]
  return (
    <aside className="guide">
      <h2>☀️ ひだまり（仮）PoC</h2>
      <p className="muted">高齢者の人生・つながり・毎日の楽しみを支えるアプリ</p>
      <h3>デモの歩き方</h3>
      {flows.map((f) => (
        <button key={f.t} className="guide-item" onClick={f.run}>
          <b>{f.t}</b>
          <span>{f.s}</span>
        </button>
      ))}
      <div className="guide-note">
        <p>
          🎤 録音はマイク許可が必要です。
          <br />
          📝 文字起こし: {speechSupported ? '✅ このブラウザで使えます' : '⚠️ このブラウザ非対応（Chrome / Edge 推奨）'}
          <br />
          💾 データはこのブラウザ内だけに保存されます（サーバー無し）。
        </p>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <div className="stage">
      <DemoGuide />
      <div className="phone">
        <DemoBar />
        <div className="phone-scroll">
          <SafeArea>
            <Router />
          </SafeArea>
        </div>
        <ToastHost />
      </div>
    </div>
  )
}
