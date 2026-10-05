import { useState } from 'react'
import { AudioButton, BigButton, ConfirmButton, Empty, MediaImage, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { formatDate, useActiveSenior, useMe, userById, useStore } from '../store'
import type { Memory } from '../types'

export function MemoryList() {
  const { state } = useStore()
  const me = useMe()!
  const senior = useActiveSenior()
  const list = state.memories.filter((m) => m.seniorId === senior?.id)
  const mine = me.kind === 'senior'

  return (
    <Screen title={mine ? '思い出' : `${senior?.callName ?? ''}の思い出`}>
      {mine && (
        <BigButton variant="secondary" onClick={() => go('/answer/free')}>
          🎤 自由に話して残す
        </BigButton>
      )}
      {list.length === 0 ? (
        <Empty emoji="📖">まだ思い出はありません。{mine ? 'ホームの「今日の質問」から始めてみましょう。' : ''}</Empty>
      ) : (
        <div className="memory-list">
          {list.map((m) => (
            <MemoryCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </Screen>
  )
}

function MemoryCard({ m }: { m: Memory }) {
  return (
    <button className="memory-card" onClick={() => go(`/memories/${m.id}`)}>
      {m.photoMediaId ? <MediaImage id={m.photoMediaId} className="memory-thumb" /> : <div className="memory-thumb placeholder">{m.kind === 'free' ? '🎙️' : '📖'}</div>}
      <div className="memory-card-main">
        <div className="memory-card-title">{m.title}</div>
        <div className="memory-card-meta">
          {m.era && <span>🕰 {m.era}</span>}
          {m.audioMediaId && <span>🎤 声あり</span>}
        </div>
        <div className="muted small">{formatDate(m.createdAt)}</div>
      </div>
    </button>
  )
}

export function MemoryDetail({ id }: { id: string }) {
  const { state, update } = useStore()
  const me = useMe()!
  const m = state.memories.find((x) => x.id === id)
  const [editing, setEditing] = useState(false)
  if (!m) return <Screen backTo="/memories">見つかりませんでした。</Screen>
  const owner = userById(state, m.seniorId)
  const sq = m.supporterQuestionId ? state.supporterQuestions.find((s) => s.id === m.supporterQuestionId) : undefined
  const asker = sq ? userById(state, sq.fromId) : undefined
  const isOwner = me.id === m.seniorId

  return (
    <Screen backTo={true} title="思い出" nav={false}>
      {m.photoMediaId && <MediaImage id={m.photoMediaId} className="hero-photo" />}
      <h2 className="memory-title">{m.title}</h2>
      {m.question && (
        <p className="memory-question">
          {asker ? `${asker.callName}からの質問：` : '質問：'}「{m.question}」
        </p>
      )}

      {m.audioMediaId && <AudioButton mediaId={m.audioMediaId} label={`▶ ${isOwner ? '自分' : owner?.callName}の声を聞く`} />}

      {editing ? (
        <EditMemory m={m} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="transcript-box">{m.transcript || <span className="muted">（文字起こしはありません）</span>}</div>

          {m.answers && m.answers.length > 0 && (
            <div className="answers">
              {m.answers.map((a, i) => (
                <div key={i} className="answer-item">
                  <div className="muted small">{a.question}</div>
                  <p>{a.transcript || '（声のみ）'}</p>
                  {a.audioMediaId && <AudioButton mediaId={a.audioMediaId} label="▶ 声を聞く" />}
                </div>
              ))}
            </div>
          )}

          <dl className="facts">
            <div>
              <dt>🕰 年代</dt>
              <dd>{m.era || '—'}</dd>
            </div>
            <div>
              <dt>📍 場所</dt>
              <dd>{m.place || '—'}</dd>
            </div>
            <div>
              <dt>👥 登場人物</dt>
              <dd>{m.people || '—'}</dd>
            </div>
            <div>
              <dt>📅 残した日</dt>
              <dd>{formatDate(m.createdAt)}</dd>
            </div>
          </dl>
          <BigButton variant="secondary" onClick={() => setEditing(true)}>
            ✏️ くわしく書き足す
          </BigButton>
          {isOwner && (
            <ConfirmButton
              confirmLabel="この思い出を消しますか？声と写真も消えます。"
              onConfirm={() => {
                update((d) => {
                  d.memories = d.memories.filter((x) => x.id !== m.id)
                })
                toast('消しました')
                go('/memories')
              }}
            >
              🗑 この思い出を消す
            </ConfirmButton>
          )}
        </>
      )}
    </Screen>
  )
}

function EditMemory({ m, onDone }: { m: Memory; onDone: () => void }) {
  const { update } = useStore()
  const [f, setF] = useState({ title: m.title, era: m.era ?? '', place: m.place ?? '', people: m.people ?? '', transcript: m.transcript })
  const field = (k: keyof typeof f, label: string, multiline = false) => (
    <label className="field">
      <span>{label}</span>
      {multiline ? <textarea rows={6} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  )
  return (
    <div className="edit-form">
      {field('title', 'タイトル')}
      {field('era', '年代（例：昭和30年ごろ）')}
      {field('place', '場所')}
      {field('people', '登場人物')}
      {field('transcript', 'お話（文字起こしを直せます）', true)}
      <div className="row">
        <BigButton variant="secondary" onClick={onDone}>
          やめる
        </BigButton>
        <BigButton
          onClick={() => {
            update((d) => {
              Object.assign(d.memories.find((x) => x.id === m.id)!, f, { updatedAt: Date.now() })
            })
            toast('保存しました')
            onDone()
          }}
        >
          ✓ 保存する
        </BigButton>
      </div>
    </div>
  )
}
