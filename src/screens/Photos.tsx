import { useState } from 'react'
import { Recorder } from '../components/Recorder'
import { BigButton, Empty, MediaImage, PhotoPicker, Screen } from '../components/ui'
import { go } from '../lib/router'
import { markMissionIfMatches, newMemory, putMedia, useActiveSenior, useMe, useStore } from '../store'
import { PHOTO_QUESTIONS } from '../seed'
import type { Answer } from '../types'

export function PhotoList() {
  const { state } = useStore()
  const senior = useActiveSenior()
  const photos = state.memories.filter((m) => m.seniorId === senior?.id && m.photoMediaId)
  return (
    <Screen title="写真">
      <BigButton onClick={() => go('/photos/new')}>📷 写真を追加する</BigButton>
      {photos.length === 0 ? (
        <Empty emoji="🖼️">写真を1枚えらんで、その時のことをお話ししてみませんか？</Empty>
      ) : (
        <div className="photo-grid">
          {photos.map((m) => (
            <button key={m.id} className="photo-tile" onClick={() => go(`/memories/${m.id}`)}>
              <MediaImage id={m.photoMediaId} />
              <span className="photo-caption">
                {m.audioMediaId ? '🎤 ' : ''}
                {m.era || m.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </Screen>
  )
}

/** 写真 → 質問 → 音声で回答 → 写真＋エピソード＋音声を保存（User Flow ②） */
export function PhotoStory() {
  const { update } = useStore()
  const me = useMe()!
  const [photoId, setPhotoId] = useState<string>()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(Answer | null)[]>([])
  const [savedId, setSavedId] = useState<string>()

  const finish = (all: (Answer | null)[]) => {
    const byKey = Object.fromEntries(PHOTO_QUESTIONS.map((q, i) => [q.key, all[i]]))
    const story = byKey.story
    const mem = newMemory({
      seniorId: me.id,
      kind: 'photo',
      title: pickTitle(byKey.era?.transcript, byKey.place?.transcript, story?.transcript),
      photoMediaId: photoId,
      transcript: story?.transcript ?? '',
      audioMediaId: story?.audioMediaId,
      era: short(byKey.era?.transcript),
      place: short(byKey.place?.transcript),
      people: short(byKey.people?.transcript),
      answers: all.filter((a): a is Answer => !!a && (!!a.transcript || !!a.audioMediaId)),
    })
    update((d) => {
      d.memories.unshift(mem)
      markMissionIfMatches(d, me.id, 'photo')
    })
    setSavedId(mem.id)
  }

  if (savedId)
    return (
      <Screen nav={false}>
        <div className="saved">
          <MediaImage id={photoId} className="saved-photo" />
          <h2>写真の思い出を残しました</h2>
          <p className="muted center">写真の「意味」まで残せました。ありがとうございます。</p>
          <div className="stack">
            <BigButton onClick={() => go(`/memories/${savedId}`)}>📖 見てみる</BigButton>
            <BigButton variant="secondary" onClick={() => go('/photos')}>
              📷 写真一覧へ
            </BigButton>
          </div>
        </div>
      </Screen>
    )

  if (!photoId)
    return (
      <Screen title="写真を追加する" backTo="/photos" nav={false}>
        <div className="empty">
          <div className="empty-emoji">🖼️</div>
          <p>思い出の写真を1枚えらんでください。</p>
        </div>
        <PhotoPicker onPicked={async (b) => setPhotoId(await putMedia(b))} />
      </Screen>
    )

  const q = PHOTO_QUESTIONS[step]
  const next = (a: Answer | null) => {
    const all = [...answers]
    all[step] = a
    setAnswers(all)
    if (step + 1 < PHOTO_QUESTIONS.length) setStep(step + 1)
    else finish(all)
  }

  return (
    <Screen title={`質問 ${step + 1} / ${PHOTO_QUESTIONS.length}`} backTo="/photos" nav={false}>
      <MediaImage id={photoId} className="hero-photo" />
      <p className="question-big">「{q.text}」</p>
      <Recorder
        key={step}
        compact
        saveLabel={step + 1 < PHOTO_QUESTIONS.length ? '✓ つぎへ' : '✓ 保存する'}
        onSave={async ({ blob, transcript }) => next({ question: q.text, transcript, audioMediaId: await putMedia(blob) })}
      />
      <button className="text-link" onClick={() => next(null)}>
        {step + 1 < PHOTO_QUESTIONS.length ? 'わからないので、とばす' : 'お話しせずに保存する'}
      </button>
    </Screen>
  )
}

const short = (t?: string) => (t ? t.replace(/。$/, '').slice(0, 40) : undefined)

function pickTitle(era?: string, place?: string, story?: string) {
  const s = story?.split(/[。！？\n]/)[0]?.trim()
  if (s && s.length <= 22) return s
  const parts = [short(era), short(place)].filter(Boolean)
  if (parts.length) return parts.join('・') + 'の写真'
  return '写真の思い出'
}
