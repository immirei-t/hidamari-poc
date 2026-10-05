import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { get, set, createStore } from 'idb-keyval'
import type { AppState, ID, Memory, Message, User } from './types'
import { createSeed, MISSIONS, QUESTION_BANK, type MissionKind } from './seed'

// ---- 永続化（PoC: ブラウザの IndexedDB。本番ではサーバーDB + クラウドストレージへ） ----
const stateStore = createStore('hidamari', 'state')
const mediaStore = createStore('hidamari-media', 'media')
const STATE_KEY = 'app-state'

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export async function putMedia(blob: Blob): Promise<ID> {
  const id = uid('media')
  await set(id, blob, mediaStore)
  return id
}

const mediaCache = new Map<ID, string>()
export function useMediaUrl(id?: ID): string | undefined {
  const [url, setUrl] = useState<string | undefined>(id ? mediaCache.get(id) : undefined)
  useEffect(() => {
    if (!id) return setUrl(undefined)
    const cached = mediaCache.get(id)
    if (cached) return setUrl(cached)
    let alive = true
    get<Blob>(id, mediaStore).then((blob) => {
      if (!blob || !alive) return
      const u = URL.createObjectURL(blob)
      mediaCache.set(id, u)
      setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}

// ---- 日付ユーティリティ ----
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const dayNumber = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000)

export function todaysMission(seniorId: ID) {
  // 人ごとに少しずらして、日替わりで1つ
  const offset = seniorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return MISSIONS[(dayNumber() + offset) % MISSIONS.length]
}

export function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatTime(ts: number) {
  const d = new Date(ts)
  const sameDay = todayKey(d) === todayKey()
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return sameDay ? `今日 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

// ---- Store ----
type Updater = (draft: AppState) => void

interface StoreValue {
  state: AppState
  update: (fn: Updater) => void
  reset: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const saveTimer = useRef<number>()

  useEffect(() => {
    get<AppState>(STATE_KEY, stateStore).then((saved) => setState(saved ?? createSeed()))
  }, [])

  useEffect(() => {
    if (!state) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => set(STATE_KEY, state, stateStore), 150)
  }, [state])

  const update = useCallback((fn: Updater) => {
    setState((prev) => {
      if (!prev) return prev
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const reset = useCallback(() => {
    setState(createSeed())
    location.hash = '#/'
  }, [])

  if (!state) return <div className="loading">読み込み中…</div>
  return <StoreContext.Provider value={{ state, update, reset }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const v = useContext(StoreContext)
  if (!v) throw new Error('StoreProvider missing')
  return v
}

// ---- セレクタ ----
export function useMe(): User | undefined {
  const { state } = useStore()
  return state.users.find((u) => u.id === state.currentUserId)
}

export function userById(state: AppState, id?: ID) {
  return state.users.find((u) => u.id === id)
}

/** 本人ならその人、サポーターなら今見ている本人 */
export function useActiveSenior(): User | undefined {
  const { state } = useStore()
  const me = useMe()
  if (!me) return undefined
  if (me.kind === 'senior') return me
  const mine = supportedSeniors(state, me.id)
  return mine.find((s) => s.id === state.activeSeniorId) ?? mine[0]
}

export function supportedSeniors(state: AppState, supporterId: ID): User[] {
  return state.relationships
    .filter((r) => r.supporterId === supporterId && r.status === 'active')
    .map((r) => userById(state, r.seniorId))
    .filter((u): u is User => !!u)
}

export function supportersOf(state: AppState, seniorId: ID) {
  return state.relationships
    .filter((r) => r.seniorId === seniorId && r.status === 'active')
    .map((r) => ({ rel: r, user: userById(state, r.supporterId)! }))
    .filter((x) => x.user)
}

export function friendsOf(state: AppState, userId: ID): User[] {
  return state.friendships
    .filter((f) => f.status === 'accepted' && (f.fromId === userId || f.toId === userId))
    .map((f) => userById(state, f.fromId === userId ? f.toId : f.fromId))
    .filter((u): u is User => !!u)
}

/** メッセージを送り合える相手（友達 + サポーター関係） */
export function contactsOf(state: AppState, me: User): User[] {
  if (me.kind === 'senior') {
    return [...friendsOf(state, me.id), ...supportersOf(state, me.id).map((s) => s.user)]
  }
  return supportedSeniors(state, me.id)
}

export function unreadFrom(state: AppState, meId: ID, fromId?: ID): Message[] {
  return state.messages.filter((m) => m.toId === meId && !m.readAt && (!fromId || m.fromId === fromId))
}

export function todaysQuestion(state: AppState, seniorId: ID) {
  const answered = new Set(state.memories.filter((m) => m.seniorId === seniorId).map((m) => m.questionId))
  const skipped = new Set(state.skippedQuestionIds[seniorId] ?? [])
  const pool = QUESTION_BANK.filter((q) => !answered.has(q.id))
  const fresh = pool.filter((q) => !skipped.has(q.id))
  const list = fresh.length ? fresh : pool.length ? pool : QUESTION_BANK
  return list[dayNumber() % list.length]
}

export const EXTRA_WATER = 'water-extra'

export function isMissionDone(state: AppState, seniorId: ID) {
  const date = todayKey()
  return state.missionLogs.some((l) => l.seniorId === seniorId && l.date === date && l.missionId !== EXTRA_WATER)
}

/** その日のミッションの種類に合う行動をしたら、自動で「できた」にする */
export function markMissionIfMatches(draft: AppState, seniorId: ID, kind: MissionKind) {
  const mission = todaysMission(seniorId)
  if (mission.id !== kind) return
  const date = todayKey()
  if (isMissionDone(draft, seniorId)) return
  draft.missionLogs.push({ seniorId, date, missionId: mission.id, doneAt: Date.now() })
}

export function newMemory(partial: Partial<Memory> & Pick<Memory, 'seniorId' | 'title' | 'kind'>): Memory {
  const t = Date.now()
  return { id: uid('mem'), transcript: '', createdAt: t, updatedAt: t, ...partial }
}

export function makeInviteCode(name: string) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const head = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
  void name
  return `${head}-${String(Math.floor(1000 + Math.random() * 9000))}`
}
