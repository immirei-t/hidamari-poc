import { useState } from 'react'
import { Recorder } from '../components/Recorder'
import { BigButton, MediaImage, Screen } from '../components/ui'
import { go } from '../lib/router'
import { markMissionIfMatches, newMemory, putMedia, useMe, userById, useStore } from '../store'
import { QUESTION_BANK, SONG_QUESTION } from '../seed'

/**
 * 質問に話して答える（User Flow ① / ③）
 *   /answer/bank/:qid  … 今日の質問
 *   /answer/sq/:id     … サポーターからの質問
 *   /answer/song       … ミッション「好きだった曲」
 *   /answer/free       … 自由に話す
 */
export function Answer({ mode, id }: { mode: string; id?: string }) {
  const { state, update } = useStore()
  const me = useMe()!
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string>()

  const sq = mode === 'sq' ? state.supporterQuestions.find((s) => s.id === id) : undefined
  const bankQ = mode === 'bank' ? QUESTION_BANK.find((q) => q.id === id) : mode === 'song' ? SONG_QUESTION : undefined
  const questionText = sq?.text ?? bankQ?.text ?? '今日、話しておきたいことはありますか？'
  const from = sq ? userById(state, sq.fromId) : undefined

  if (savedId) {
    return (
      <Screen nav={false}>
        <div className="saved">
          <div className="saved-emoji">🌸</div>
          <h2>思い出に残しました</h2>
          <p className="muted center">
            {from ? `${from.callName}にも届きました。きっと喜びますよ。` : 'すてきなお話をありがとうございます。'}
          </p>
          <div className="stack">
            <BigButton onClick={() => go(`/memories/${savedId}`)}>📖 思い出を見る</BigButton>
            <BigButton variant="secondary" onClick={() => go('/')}>
              🏠 ホームにもどる
            </BigButton>
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen backTo="/" nav={false} title={sq ? `${from?.callName}から` : mode === 'free' ? '自由に話す' : '今日の質問'}>
      {sq?.photoMediaId && <MediaImage id={sq.photoMediaId} className="hero-photo" />}
      <p className="question-big">「{questionText}」</p>
      <Recorder
        saving={saving}
        onSave={async ({ blob, transcript }) => {
          setSaving(true)
          const audioMediaId = await putMedia(blob)
          const mem = newMemory({
            seniorId: me.id,
            kind: sq?.photoMediaId ? 'photo' : mode === 'free' ? 'free' : 'question',
            title: titleFrom(questionText, transcript),
            question: mode === 'free' ? undefined : questionText,
            questionId: bankQ?.id,
            supporterQuestionId: sq?.id,
            transcript,
            audioMediaId,
            photoMediaId: sq?.photoMediaId,
          })
          update((d) => {
            d.memories.unshift(mem)
            if (sq) d.supporterQuestions.find((x) => x.id === sq.id)!.answeredMemoryId = mem.id
            markMissionIfMatches(d, me.id, mode === 'song' ? 'song' : 'question')
          })
          setSaving(false)
          setSavedId(mem.id)
        }}
      />
      {mode === 'bank' && (
        <button
          className="text-link"
          onClick={() => {
            update((d) => {
              const list = (d.skippedQuestionIds[me.id] ??= [])
              if (id && !list.includes(id)) list.push(id)
            })
            go('/')
          }}
        >
          ほかの質問にする
        </button>
      )}
    </Screen>
  )
}

/** 質問文からタイトルを作る（AI要約は将来。PoC は簡単なルール） */
export function titleFrom(question: string, transcript: string) {
  const q = question
    .replace(/[「」？?。]/g, '')
    .replace(/について教えてください|を教えてください|教えてください|はどこで出会いましたか|は何ですか|はありますか|は$/g, '')
    .replace(/、.*$/, '')
    .trim()
  if (q.length >= 4 && q.length <= 22) return q
  const t = transcript.split(/[。！!？?\n]/)[0]?.trim()
  if (t) return t.length > 20 ? t.slice(0, 20) + '…' : t
  return '思い出'
}
