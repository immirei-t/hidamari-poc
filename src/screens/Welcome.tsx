import { useState } from 'react'
import { Avatar, BigButton, PhotoPicker, MediaImage, toast } from '../components/ui'
import { go } from '../lib/router'
import { findSeniorByCode, makeInviteCode, putMedia, uid, useStore } from '../store'
import { PURPOSES } from '../seed'
import type { Purpose, SupporterRole, User } from '../types'

export function Welcome() {
  const { state, update } = useStore()
  const [showLogin, setShowLogin] = useState(false)

  const login = (u: User) =>
    update((d) => {
      d.currentUserId = u.id
      go('/')
    })

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="sun">☀️</div>
        <h1 className="brand">ひだまり</h1>
        <p className="brand-sub">（仮）</p>
        <p className="tagline">
          これまでの人生を、残す。
          <br />
          これからの毎日を、楽しく。
        </p>
      </div>

      {!showLogin ? (
        <div className="stack">
          <BigButton onClick={() => go('/signup')}>はじめる</BigButton>
          <BigButton variant="secondary" onClick={() => setShowLogin(true)}>
            ログインする
          </BigButton>
        </div>
      ) : (
        <div className="stack">
          <p className="center muted">どなたで入りますか？（PoC: パスワード省略）</p>
          {state.users.map((u) => (
            <button key={u.id} className="list-row" onClick={() => login(u)}>
              <Avatar user={u} size={48} />
              <div className="list-row-main">
                <div className="list-row-title">{u.callName}</div>
                <div className="muted small">{u.kind === 'senior' ? '本人' : 'サポーター'}</div>
              </div>
            </button>
          ))}
          <BigButton variant="ghost" onClick={() => setShowLogin(false)}>
            ← もどる
          </BigButton>
        </div>
      )}
    </div>
  )
}

const ROLES: { id: SupporterRole; label: string }[] = [
  { id: 'family', label: '家族' },
  { id: 'relative', label: '親戚' },
  { id: 'friend', label: '友人' },
  { id: 'caregiver', label: '介護者' },
  { id: 'staff', label: '施設スタッフ' },
]

export function Signup() {
  const { state, update } = useStore()
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<'senior' | 'supporter'>()
  const [name, setName] = useState('')
  const [callName, setCallName] = useState('')
  const [email, setEmail] = useState('')
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [birthYear, setBirthYear] = useState<string>('')
  const [photoId, setPhotoId] = useState<string>()
  const [seniorCode, setSeniorCode] = useState('')
  const [role, setRole] = useState<SupporterRole>('family')
  const [label, setLabel] = useState('')

  const finish = () => {
    const id = uid('u')
    const call = callName.trim() || `${name.trim().split(/\s+/).pop()}さん`
    // 照合は update の外で行う（update 内の処理は後から実行されるため、結果をここで使えない）
    const senior = kind === 'supporter' && seniorCode.trim() ? findSeniorByCode(state, seniorCode) : undefined
    update((d) => {
      d.users.push({
        id,
        kind: kind!,
        name: name.trim(),
        callName: call,
        email: email.trim() || undefined,
        avatarMediaId: photoId,
        inviteCode: makeInviteCode(name),
        createdAt: Date.now(),
      })
      if (kind === 'senior') {
        d.profiles.push({ userId: id, purposes, birthYear: birthYear ? Number(birthYear) : undefined, flowerWaterCount: 0 })
      } else if (senior) {
        // 本人の承認が必要（要件 #40: 承認した人だけアクセス）
        d.relationships.push({ id: uid('rel'), seniorId: senior.id, supporterId: id, role, label: label.trim() || ROLES.find((r) => r.id === role)!.label, status: 'pending', createdAt: Date.now() })
      }
      d.currentUserId = id
    })
    if (kind === 'supporter' && seniorCode.trim()) {
      toast(senior ? `${senior.callName}に承認をお願いしました` : 'コードが見つかりませんでした。あとから追加できます')
    }
    go('/')
  }

  const nameOk = name.trim().length > 0
  const years = Array.from({ length: 50 }, (_, i) => 1960 - i)

  return (
    <div className="screen onboarding">
      <header className="topbar">
        <button className="back" onClick={() => (step === 0 ? go('/welcome') : setStep(step - 1))}>
          ← もどる
        </button>
        <div className="steps">{[0, 1, 2, 3].slice(0, kind === 'supporter' ? 3 : 4).map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
        <span />
      </header>
      <main className="content">
        {step === 0 && (
          <>
            <h2 className="q-title">あなたは、どちらですか？</h2>
            <div className="stack">
              <button className={`choice ${kind === 'senior' ? 'on' : ''}`} onClick={() => { setKind('senior'); setStep(1) }}>
                <span className="choice-emoji">🙋</span>
                <span>
                  <b>わたしの思い出を残したい</b>
                  <br />
                  <small>わたしが話して、思い出やレシピを残します。友達ともやりとりします。</small>
                </span>
              </button>
              <button className={`choice ${kind === 'supporter' ? 'on' : ''}`} onClick={() => { setKind('supporter'); setStep(1) }}>
                <span className="choice-emoji">🤝</span>
                <span>
                  <b>家族や利用者さんを手伝いたい</b>
                  <br />
                  <small>わたしは、お子さん・お孫さん・友人・介護スタッフなど「支える側」です。</small>
                </span>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="q-title">{kind === 'supporter' ? 'あなた（支える側）のお名前' : 'あなたのお名前を教えてください'}</h2>
            <label className="field">
              <span>お名前</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'supporter' ? '例：山田 エリカ' : '例：山田 花子'} autoFocus />
            </label>
            <label className="field">
              <span>{kind === 'supporter' ? '相手から見たあなたの呼び名' : '呼ばれたい名前'}</span>
              <input value={callName} onChange={(e) => setCallName(e.target.value)} placeholder={kind === 'supporter' ? '例：エリカ' : '例：はなこさん'} />
            </label>
            <label className="field">
              <span>メールアドレス（なくても大丈夫）</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" inputMode="email" />
            </label>
            <BigButton disabled={!nameOk} onClick={() => setStep(2)}>
              つぎへ
            </BigButton>
          </>
        )}

        {step === 2 && kind === 'senior' && (
          <>
            <h2 className="q-title">このアプリを何のために使いたいですか？</h2>
            <p className="muted center">いくつ選んでも大丈夫です</p>
            <div className="stack">
              {PURPOSES.map((p) => {
                const on = purposes.includes(p.id)
                return (
                  <button key={p.id} className={`choice small-choice ${on ? 'on' : ''}`} onClick={() => setPurposes(on ? purposes.filter((x) => x !== p.id) : [...purposes, p.id])}>
                    <span className="choice-emoji">{p.emoji}</span>
                    <span>{p.label}</span>
                    <span className="check">{on ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <BigButton onClick={() => setStep(3)}>{purposes.length ? 'つぎへ' : 'あとで決める'}</BigButton>
          </>
        )}

        {step === 3 && kind === 'senior' && (
          <>
            <h2 className="q-title">プロフィール</h2>
            <div className="center">
              {photoId ? <MediaImage id={photoId} className="profile-photo" /> : <Avatar user={{ id: 'x', callName: callName || name } as User} size={110} />}
            </div>
            <PhotoPicker variant="secondary" label="📷 写真をえらぶ（なくても大丈夫）" onPicked={async (b) => setPhotoId(await putMedia(b))} />
            <label className="field">
              <span>生まれた年（なくても大丈夫）</span>
              <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
                <option value="">えらばない</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}年（{wareki(y)}）
                  </option>
                ))}
              </select>
            </label>
            <BigButton onClick={finish}>はじめる</BigButton>
          </>
        )}

        {step === 2 && kind === 'supporter' && (
          <>
            <h2 className="q-title">支える相手とつながる</h2>
            <p className="muted">相手（思い出を残すご本人）のアプリの「💬 つながり」画面に、招待コードがあります。そのコードを入れてください。</p>
            <p className="muted">相手が「承認する」を押すと、思い出を見たり、質問を送ったりできるようになります。</p>
            <label className="field">
              <span>相手の招待コード</span>
              <input value={seniorCode} onChange={(e) => setSeniorCode(e.target.value)} placeholder="例：HANA-2741" autoCapitalize="characters" />
            </label>
            <div className="field">
              <span>相手から見て、あなたは？</span>
              <div className="chips">
                {ROLES.map((r) => (
                  <button key={r.id} className={`chip ${role === r.id ? 'on' : ''}`} onClick={() => setRole(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>相手との関係（例：孫、長女、担当スタッフ）</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="孫" />
            </label>
            <BigButton onClick={finish}>{seniorCode.trim() ? 'つながる' : 'あとでつながる'}</BigButton>
            <p className="muted small center">デモ用（思い出を残すご本人）のコード: {state.users.filter((u) => u.kind === 'senior').map((u) => `${u.callName} ${u.inviteCode}`).join(' / ')}</p>
          </>
        )}
      </main>
    </div>
  )
}

function wareki(y: number) {
  if (y >= 1989) return `平成${y - 1988}年`
  if (y >= 1926) return `昭和${y - 1925}年`
  return `大正${y - 1911}年`
}
