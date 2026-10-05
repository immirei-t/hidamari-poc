// データモデル（要件 #41, #42）
// 「1ユーザー = 1高齢者」に固定しない設計:
//   - User は senior（本人）か supporter（家族・友人・介護者・施設スタッフ）
//   - Relationship で 本人 ⇔ サポーター を多対多で結ぶ
//   - Friendship で 本人 ⇔ 本人 を結ぶ（クローズドな友達関係）

export type ID = string

export type UserKind = 'senior' | 'supporter'

export interface User {
  id: ID
  kind: UserKind
  name: string // フルネーム
  callName: string // 呼び名（「はなこさん」など）
  email?: string
  avatarMediaId?: ID
  inviteCode: string // 友達・サポーター招待用コード
  createdAt: number
}

export type Purpose =
  | 'lifestory'
  | 'photo'
  | 'recipe'
  | 'family'
  | 'friends'
  | 'fun'
  | 'role'
  | 'facility'

export interface SeniorProfile {
  userId: ID
  birthYear?: number
  purposes: Purpose[]
  flowerWaterCount: number // 植物（忘れても枯れない）
}

export type SupporterRole = 'family' | 'relative' | 'friend' | 'caregiver' | 'staff'

export interface Relationship {
  id: ID
  seniorId: ID
  supporterId: ID
  role: SupporterRole
  label: string // 例: 「孫」「長女」「ケアスタッフ」
  status: 'pending' | 'active'
  createdAt: number
}

export interface Friendship {
  id: ID
  fromId: ID // 申請した人
  toId: ID
  status: 'pending' | 'accepted' | 'blocked'
  blockedBy?: ID
  createdAt: number
}

export interface Answer {
  question: string
  transcript: string
  audioMediaId?: ID
}

export interface Memory {
  id: ID
  seniorId: ID
  kind: 'question' | 'photo' | 'free'
  title: string
  question?: string
  questionId?: string // 質問バンクのID
  supporterQuestionId?: ID
  transcript: string
  audioMediaId?: ID
  photoMediaId?: ID
  era?: string // 年代
  place?: string
  people?: string
  answers?: Answer[] // 写真の質問ごとの回答など
  createdAt: number
  updatedAt: number
}

export interface Recipe {
  id: ID
  seniorId: ID
  name: string
  photoMediaId?: ID
  ingredients: string
  steps: string
  tips: string
  story: string
  howToTranscript: string
  howToAudioMediaId?: ID
  storyAudioMediaId?: ID
  createdAt: number
}

export interface Message {
  id: ID
  fromId: ID
  toId: ID
  text?: string
  audioMediaId?: ID
  transcript?: string
  imageMediaId?: ID
  stamp?: string
  createdAt: number
  readAt?: number
}

export interface SupporterQuestion {
  id: ID
  seniorId: ID
  fromId: ID
  text: string
  photoMediaId?: ID
  createdAt: number
  answeredMemoryId?: ID
}

export interface MissionLog {
  seniorId: ID
  date: string // YYYY-MM-DD
  missionId: string
  doneAt: number
}

export interface Report {
  id: ID
  reporterId: ID
  targetId: ID
  createdAt: number
}

export interface AppState {
  version: number
  currentUserId?: ID
  activeSeniorId?: ID // サポーターが今見ている本人
  users: User[]
  profiles: SeniorProfile[]
  relationships: Relationship[]
  friendships: Friendship[]
  memories: Memory[]
  recipes: Recipe[]
  messages: Message[]
  supporterQuestions: SupporterQuestion[]
  missionLogs: MissionLog[]
  reports: Report[]
  skippedQuestionIds: Record<ID, string[]>
}
