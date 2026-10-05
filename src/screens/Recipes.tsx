import { useState } from 'react'
import { Recorder } from '../components/Recorder'
import { AudioButton, BigButton, ConfirmButton, Empty, MediaImage, PhotoPicker, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { formatDate, markMissionIfMatches, putMedia, uid, useActiveSenior, useMe, userById, useStore } from '../store'
import { RECIPE_IDEAS } from '../seed'
import type { Recipe } from '../types'

export function RecipeList() {
  const { state } = useStore()
  const me = useMe()!
  const senior = useActiveSenior()
  const list = state.recipes.filter((r) => r.seniorId === senior?.id)
  return (
    <Screen title={me.kind === 'senior' ? 'レシピ' : `${senior?.callName ?? ''}のレシピ`}>
      {me.kind === 'senior' && <BigButton onClick={() => go('/recipes/new')}>🍳 レシピを残す</BigButton>}
      {list.length === 0 ? (
        <Empty emoji="🍲">得意料理の作り方を、話すだけで残せます。</Empty>
      ) : (
        <div className="memory-list">
          {list.map((r) => (
            <button key={r.id} className="memory-card" onClick={() => go(`/recipes/${r.id}`)}>
              {r.photoMediaId ? <MediaImage id={r.photoMediaId} className="memory-thumb" /> : <div className="memory-thumb placeholder">🍳</div>}
              <div className="memory-card-main">
                <div className="memory-card-title">{r.name}</div>
                <div className="memory-card-meta">{r.howToAudioMediaId && <span>🎤 声あり</span>}</div>
                <div className="muted small">{formatDate(r.createdAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Screen>
  )
}

/** 料理名 → 写真（任意）→「どうやって作るの？」に話す →（任意）思い出を話す → 保存 */
export function RecipeNew() {
  const { update } = useStore()
  const me = useMe()!
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [photoId, setPhotoId] = useState<string>()
  const [howTo, setHowTo] = useState<{ t: string; a: string }>()

  const save = (story?: { t: string; a: string }) => {
    const r: Recipe = {
      id: uid('rcp'),
      seniorId: me.id,
      name: name.trim(),
      photoMediaId: photoId,
      ingredients: '',
      steps: draftSteps(howTo?.t ?? ''),
      tips: '',
      story: story?.t ?? '',
      howToTranscript: howTo?.t ?? '',
      howToAudioMediaId: howTo?.a,
      storyAudioMediaId: story?.a,
      createdAt: Date.now(),
    }
    update((d) => {
      d.recipes.unshift(r)
      markMissionIfMatches(d, me.id, 'recipe')
    })
    toast('レシピを残しました 🍳')
    go(`/recipes/${r.id}`)
  }

  return (
    <Screen title="レシピを残す" backTo="/recipes" nav={false}>
      {step === 0 && (
        <>
          <h2 className="q-title">何の料理ですか？</h2>
          <div className="chips">
            {RECIPE_IDEAS.map((r) => (
              <button key={r} className={`chip ${name === r ? 'on' : ''}`} onClick={() => setName(r)}>
                {r}
              </button>
            ))}
          </div>
          <label className="field">
            <span>料理の名前</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：肉じゃが" />
          </label>
          <BigButton disabled={!name.trim()} onClick={() => setStep(1)}>
            つぎへ
          </BigButton>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="q-title">{name}の写真はありますか？</h2>
          {photoId && <MediaImage id={photoId} className="hero-photo" />}
          <PhotoPicker variant={photoId ? 'secondary' : 'primary'} label={photoId ? '📷 写真をえらびなおす' : '📷 写真をえらぶ'} onPicked={async (b) => setPhotoId(await putMedia(b))} />
          <BigButton variant={photoId ? 'primary' : 'secondary'} onClick={() => setStep(2)}>
            {photoId ? 'つぎへ' : '写真なしでつぎへ'}
          </BigButton>
        </>
      )}
      {step === 2 && (
        <>
          <p className="question-big">「この{name}、どうやって作るの？」</p>
          <p className="muted center">材料や、作る順番を、ふだん通りにお話しください。</p>
          <Recorder
            saveLabel="✓ つぎへ"
            onSave={async ({ blob, transcript }) => {
              setHowTo({ t: transcript, a: await putMedia(blob) })
              setStep(3)
            }}
          />
        </>
      )}
      {step === 3 && (
        <>
          <p className="question-big">「{name}にまつわる思い出や、コツはありますか？」</p>
          <Recorder saveLabel="✓ 保存する" onSave={async ({ blob, transcript }) => save({ t: transcript, a: await putMedia(blob) })} />
          <button className="text-link" onClick={() => save()}>
            話さずに保存する
          </button>
        </>
      )}
    </Screen>
  )
}

/** 文字起こしを文ごとに番号付きの「作り方の下書き」にする（AIによる材料・分量の整理は将来機能） */
function draftSteps(t: string) {
  return t
    .split(/[。\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n')
}

export function RecipeDetail({ id }: { id: string }) {
  const { state, update } = useStore()
  const me = useMe()!
  const r = state.recipes.find((x) => x.id === id)
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState(r ? { name: r.name, ingredients: r.ingredients, steps: r.steps, tips: r.tips, story: r.story } : undefined)
  if (!r || !f) return <Screen backTo="/recipes">見つかりませんでした。</Screen>
  const owner = userById(state, r.seniorId)
  const isOwner = me.id === r.seniorId
  const who = isOwner ? '自分' : owner?.callName

  return (
    <Screen title="レシピ" backTo="/recipes" nav={false}>
      {r.photoMediaId && <MediaImage id={r.photoMediaId} className="hero-photo" />}
      <h2 className="memory-title">{r.name}</h2>
      <p className="muted">{owner?.callName}のレシピ</p>
      {r.howToAudioMediaId && <AudioButton mediaId={r.howToAudioMediaId} label={`▶ ${who}の声で作り方を聞く`} />}
      {r.storyAudioMediaId && <AudioButton mediaId={r.storyAudioMediaId} label="▶ 思い出・コツを聞く" />}

      {editing ? (
        <div className="edit-form">
          {(
            [
              ['name', '料理名', false],
              ['ingredients', '材料・分量', true],
              ['steps', '作り方', true],
              ['tips', 'コツ', true],
              ['story', '料理にまつわる思い出', true],
            ] as const
          ).map(([k, label, multi]) => (
            <label key={k} className="field">
              <span>{label}</span>
              {multi ? <textarea rows={5} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
            </label>
          ))}
          <div className="row">
            <BigButton variant="secondary" onClick={() => setEditing(false)}>
              やめる
            </BigButton>
            <BigButton
              onClick={() => {
                update((d) => {
                  Object.assign(d.recipes.find((x) => x.id === r.id)!, f)
                })
                setEditing(false)
                toast('保存しました')
              }}
            >
              ✓ 保存する
            </BigButton>
          </div>
        </div>
      ) : (
        <>
          <Section title="🥕 材料・分量" body={r.ingredients} empty="まだありません（家族が声を聞きながら書き足せます）" />
          <Section title="👩‍🍳 作り方" body={r.steps} empty="—" />
          <Section title="💡 コツ" body={r.tips} empty="—" />
          <Section title="💭 思い出" body={r.story} empty="—" />
          <div className="ai-note">✨ 将来: AIが声から「材料・分量・作り方」を自動で整理します</div>
          <BigButton variant="secondary" onClick={() => setEditing(true)}>
            ✏️ 書き足す・直す
          </BigButton>
          {isOwner && (
            <ConfirmButton
              confirmLabel="このレシピを消しますか？"
              onConfirm={() => {
                update((d) => {
                  d.recipes = d.recipes.filter((x) => x.id !== r.id)
                })
                go('/recipes')
              }}
            >
              🗑 このレシピを消す
            </ConfirmButton>
          )}
        </>
      )}
    </Screen>
  )
}

function Section({ title, body, empty }: { title: string; body: string; empty: string }) {
  return (
    <div className="recipe-section">
      <h3>{title}</h3>
      <p className={body ? 'pre' : 'muted'}>{body || empty}</p>
    </div>
  )
}
