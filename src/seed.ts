import type { AppState, Purpose } from './types'

export const PURPOSES: { id: Purpose; emoji: string; label: string }[] = [
  { id: 'lifestory', emoji: '📖', label: '自分の人生や思い出を残したい' },
  { id: 'photo', emoji: '📷', label: '写真のエピソードを残したい' },
  { id: 'recipe', emoji: '🍳', label: '家族のレシピを残したい' },
  { id: 'family', emoji: '👪', label: '家族や大切な人とつながりたい' },
  { id: 'friends', emoji: '💌', label: '友達と簡単に連絡したい' },
  { id: 'fun', emoji: '🌷', label: '毎日の楽しみがほしい' },
  { id: 'role', emoji: '✨', label: '毎日何か役割を持ちたい' },
  { id: 'facility', emoji: '🏡', label: '施設で利用したい' },
]

export const QUESTION_BANK: { id: string; text: string }[] = [
  { id: 'q01', text: '子どもの頃、一番好きだった遊びは？' },
  { id: 'q02', text: '初めて働いた仕事について教えてください。' },
  { id: 'q03', text: 'パートナーとはどこで出会いましたか？' },
  { id: 'q04', text: '人生で一番嬉しかったことは？' },
  { id: 'q05', text: '若い頃の自分に伝えたいことは？' },
  { id: 'q06', text: '生まれ育った町は、どんなところでしたか？' },
  { id: 'q07', text: '子どもの頃によく食べた、思い出の味は？' },
  { id: 'q08', text: '学生時代の一番の思い出は？' },
  { id: 'q09', text: '今までで一番印象に残っている旅行は？' },
  { id: 'q10', text: 'お母さんは、どんな人でしたか？' },
  { id: 'q11', text: 'お父さんは、どんな人でしたか？' },
  { id: 'q12', text: '得意だったこと、褒められたことは？' },
  { id: 'q13', text: '大切にしている言葉はありますか？' },
  { id: 'q14', text: 'お祭りや季節の行事の思い出は？' },
  { id: 'q15', text: '孫やひ孫に伝えたいことは？' },
]

export const SONG_QUESTION = { id: 'song', text: '若い頃によく聞いた、好きだった曲は？その曲の思い出も教えてください。' }

export const PHOTO_QUESTIONS = [
  { key: 'era', text: 'これはいつ頃の写真ですか？' },
  { key: 'place', text: 'どこで撮りましたか？' },
  { key: 'people', text: '誰と一緒ですか？' },
  { key: 'story', text: 'この時のことを教えてください。' },
] as const

export type MissionKind = 'water' | 'photo' | 'message' | 'song' | 'recipe' | 'question'

export const MISSIONS: { id: MissionKind; emoji: string; title: string; hint: string }[] = [
  { id: 'water', emoji: '🌷', title: 'お花に水をあげよう', hint: 'ボタンを押すだけ。お花が少しずつ育ちます。' },
  { id: 'photo', emoji: '📷', title: '昔の写真について1つ話そう', hint: '写真を1枚えらんで、思い出をお話ししてください。' },
  { id: 'message', emoji: '💌', title: '友達に一言送ろう', hint: 'スタンプひとつでも大丈夫です。' },
  { id: 'song', emoji: '🎵', title: '好きだった曲を思い出そう', hint: '曲の名前と、その頃の思い出をお話ししてください。' },
  { id: 'recipe', emoji: '🍳', title: '得意料理について教えてください', hint: '作り方を話すだけで、レシピとして残ります。' },
  { id: 'question', emoji: '📖', title: '今日の質問に答えよう', hint: '話すだけで、思い出として残ります。' },
]

export const QUICK_REPLIES = ['ありがとう', '元気だよ', 'また会おうね', '楽しみにしています', 'おはよう', 'おやすみなさい']
export const STAMPS = ['❤️', '😊', '🌷', '👏', '🙏', '🎉', '☀️', '🍵']

export const SUPPORTER_QUESTION_IDEAS = [
  '若い頃、どんな仕事をしていたの？',
  'おじいちゃんとの思い出を教えて',
  'この家に引っ越してきた頃の話を聞かせて',
  '子どもの頃の夢は何だった？',
  'お正月はどんなふうに過ごしていたの？',
]

export const RECIPE_IDEAS = ['肉じゃが', '卵焼き', 'ちらし寿司', 'お味噌汁', 'きんぴらごぼう', 'おはぎ']

const now = Date.now()
const hour = 60 * 60 * 1000

export function createSeed(): AppState {
  return {
    version: 1,
    currentUserId: undefined,
    users: [
      { id: 'u-hanako', kind: 'senior', name: '山田 花子', callName: 'はなこさん', inviteCode: 'HANA-2741', createdAt: now - 72 * hour },
      { id: 'u-yoshiko', kind: 'senior', name: '佐藤 よし子', callName: 'よしこさん', inviteCode: 'YOSI-5813', createdAt: now - 72 * hour },
      { id: 'u-takeshi', kind: 'senior', name: '鈴木 武', callName: 'たけしさん', inviteCode: 'TAKE-3926', createdAt: now - 72 * hour },
      { id: 'u-erika', kind: 'supporter', name: '山田 エリカ', callName: 'エリカさん', inviteCode: 'ERIK-1180', createdAt: now - 72 * hour },
    ],
    profiles: [
      { userId: 'u-hanako', birthYear: 1944, purposes: ['lifestory', 'photo', 'recipe', 'friends', 'fun'], flowerWaterCount: 4 },
      { userId: 'u-yoshiko', birthYear: 1946, purposes: ['friends', 'fun'], flowerWaterCount: 9 },
      { userId: 'u-takeshi', birthYear: 1941, purposes: ['lifestory', 'role'], flowerWaterCount: 0 },
    ],
    relationships: [
      { id: 'r1', seniorId: 'u-hanako', supporterId: 'u-erika', role: 'family', label: '孫', status: 'active', createdAt: now - 70 * hour },
    ],
    friendships: [
      { id: 'f1', fromId: 'u-yoshiko', toId: 'u-hanako', status: 'accepted', createdAt: now - 60 * hour },
    ],
    memories: [
      {
        id: 'm-seed1',
        seniorId: 'u-hanako',
        kind: 'question',
        title: '子どもの頃の遊び',
        question: '子どもの頃、一番好きだった遊びは？',
        questionId: 'q01',
        transcript:
          'お手玉とおはじきが好きでしたね。夕方になると近所の子たちと神社の境内に集まって、暗くなるまで遊んでいました。母が「ごはんよ」と呼びに来るまで帰らなかったんですよ。',
        era: '1950年代',
        place: '長野の実家の近く',
        people: '近所の友達',
        createdAt: now - 30 * hour,
        updatedAt: now - 30 * hour,
      },
    ],
    recipes: [],
    messages: [
      {
        id: 'msg-seed1',
        fromId: 'u-yoshiko',
        toId: 'u-hanako',
        text: 'はなこさん、お元気ですか？今日はいいお天気ですね。また一緒にお茶しましょう。',
        createdAt: now - 2 * hour,
      },
    ],
    supporterQuestions: [
      {
        id: 'sq-seed1',
        seniorId: 'u-hanako',
        fromId: 'u-erika',
        text: 'おばあちゃん、若い頃はどんな仕事をしていたの？',
        createdAt: now - 5 * hour,
      },
    ],
    missionLogs: [],
    reports: [],
    skippedQuestionIds: {},
  }
}
