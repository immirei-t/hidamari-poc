import type { ReactNode } from 'react'
import { BigButton, Card, MediaImage, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { isMissionDone, todaysMission, todaysQuestion, unreadFrom, useMe, userById, useStore } from '../store'

export function SeniorHome() {
  const { state, update } = useStore()
  const me = useMe()!
  const profile = state.profiles.find((p) => p.userId === me.id)
  const purposes = new Set(profile?.purposes ?? [])

  const q = todaysQuestion(state, me.id)
  const mission = todaysMission(me.id)
  const missionDone = isMissionDone(state, me.id)
  const openSQ = state.supporterQuestions.filter((s) => s.seniorId === me.id && !s.answeredMemoryId)
  const unread = unreadFrom(state, me.id)
  const unreadBySender = [...new Set(unread.map((m) => m.fromId))]
  const friendReqs = state.friendships.filter((f) => f.toId === me.id && f.status === 'pending')
  const supporterReqs = state.relationships.filter((r) => r.seniorId === me.id && r.status === 'pending')

  const hour = new Date().getHours()
  const greet = hour < 10 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'こんばんは'
  const d = new Date()
  const youbi = '日月火水木金土'[d.getDay()]

  const blocks: { key: string; weight: number; node: ReactNode }[] = []

  blocks.push({
    key: 'question',
    weight: purposes.has('lifestory') ? 10 : 6,
    node: (
      <Card tone="sage">
        <div className="card-label">📖 今日の質問</div>
        <p className="question-text">「{q.text}」</p>
        <BigButton onClick={() => go(`/answer/bank/${q.id}`)}>🎤 話して答える</BigButton>
      </Card>
    ),
  })

  if (openSQ.length) {
    blocks.push({
      key: 'sq',
      weight: 9,
      node: (
        <Card tone="pink">
          <div className="card-label">💐 家族・サポーターから</div>
          {openSQ.slice(0, 2).map((s) => {
            const from = userById(state, s.fromId)
            return (
              <div key={s.id} className="sq-item">
                <p className="lead">
                  <b>{from?.callName}</b>から質問があります
                </p>
                {s.photoMediaId && <MediaImage id={s.photoMediaId} className="sq-photo" />}
                <p className="question-text small-q">「{s.text}」</p>
                <BigButton onClick={() => go(`/answer/sq/${s.id}`)}>🎤 話して答える</BigButton>
              </div>
            )
          })}
          {openSQ.length > 2 && <p className="muted center">ほかに {openSQ.length - 2} 件あります</p>}
        </Card>
      ),
    })
  }

  blocks.push({
    key: 'mission',
    weight: purposes.has('role') || purposes.has('fun') ? 8 : 5,
    node: (
      <Card tone="beige" onClick={() => go('/mission')}>
        <div className="card-label">✨ 今日の役割</div>
        <div className="mission-row">
          <span className="mission-emoji">{mission.emoji}</span>
          <span className="mission-title">{mission.title}</span>
        </div>
        {missionDone ? <p className="done-note">✓ 今日はできました。ありがとうございます！</p> : <BigButton variant="secondary">ひらく</BigButton>}
      </Card>
    ),
  })

  blocks.push({
    key: 'messages',
    weight: unread.length ? 9.5 : purposes.has('friends') || purposes.has('family') ? 7 : 3,
    node: (
      <Card tone="blue">
        <div className="card-label">💬 メッセージ</div>
        {unreadBySender.length ? (
          unreadBySender.map((fid) => {
            const from = userById(state, fid)
            const n = unread.filter((m) => m.fromId === fid).length
            return (
              <div key={fid} className="msg-notice">
                <p className="lead">
                  <b>{from?.callName}</b>から{n}件届いています
                </p>
                <BigButton onClick={() => go(`/chat/${fid}`)}>👀 見る</BigButton>
              </div>
            )
          })
        ) : (
          <>
            <p className="muted">新しいメッセージはありません。</p>
            <BigButton variant="secondary" onClick={() => go('/connections')}>
              💌 だれかに送る
            </BigButton>
          </>
        )}
      </Card>
    ),
  })

  if (friendReqs.length || supporterReqs.length) {
    blocks.push({
      key: 'requests',
      weight: 11,
      node: (
        <Card tone="pink">
          <div className="card-label">🤝 つながりのお願い</div>
          {friendReqs.map((f) => {
            const from = userById(state, f.fromId)
            return (
              <div key={f.id} className="req-item">
                <p className="lead">
                  <b>{from?.callName}</b>が友達になりたいそうです
                </p>
                <div className="row">
                  <BigButton variant="secondary" onClick={() => update((d) => { d.friendships = d.friendships.filter((x) => x.id !== f.id) })}>
                    いまはしない
                  </BigButton>
                  <BigButton
                    onClick={() => {
                      update((d) => {
                        d.friendships.find((x) => x.id === f.id)!.status = 'accepted'
                      })
                      toast(`${from?.callName}と友達になりました 🌷`)
                    }}
                  >
                    友達になる
                  </BigButton>
                </div>
              </div>
            )
          })}
          {supporterReqs.map((r) => {
            const from = userById(state, r.supporterId)
            return (
              <div key={r.id} className="req-item">
                <p className="lead">
                  <b>{from?.callName}</b>（{r.label}）がサポーターになりたいそうです
                </p>
                <p className="muted small">承認すると、思い出を見たり、質問や写真を送ったりできます。</p>
                <div className="row">
                  <BigButton variant="secondary" onClick={() => update((d) => { d.relationships = d.relationships.filter((x) => x.id !== r.id) })}>
                    いまはしない
                  </BigButton>
                  <BigButton
                    onClick={() => {
                      update((d) => {
                        d.relationships.find((x) => x.id === r.id)!.status = 'active'
                      })
                      toast(`${from?.callName}とつながりました`)
                    }}
                  >
                    承認する
                  </BigButton>
                </div>
              </div>
            )
          })}
        </Card>
      ),
    })
  }

  blocks.sort((a, b) => b.weight - a.weight)

  return (
    <Screen>
      <div className="greeting">
        <p className="date">
          {d.getMonth() + 1}月{d.getDate()}日（{youbi}）
        </p>
        <h1>
          {greet}、<br />
          {me.callName}
        </h1>
      </div>
      {blocks.map((b) => (
        <div key={b.key}>{b.node}</div>
      ))}
    </Screen>
  )
}
