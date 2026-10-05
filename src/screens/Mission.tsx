import { BigButton, Card, Screen, toast } from '../components/ui'
import { go } from '../lib/router'
import { EXTRA_WATER, isMissionDone, markMissionIfMatches, todayKey, todaysMission, todaysQuestion, useMe, useStore } from '../store'

// 植物は忘れても枯れない。回数に応じてゆっくり育つだけ（要件 #13, #22）
const STAGES = [
  { at: 0, emoji: '🌱', label: '芽が出ました' },
  { at: 3, emoji: '🌿', label: '葉っぱが増えてきました' },
  { at: 7, emoji: '🌷', label: 'つぼみがふくらんでいます' },
  { at: 14, emoji: '🌻', label: 'きれいに咲きました' },
  { at: 30, emoji: '💐', label: '花束になりました' },
]

export function Mission() {
  const { state, update } = useStore()
  const me = useMe()!
  const mission = todaysMission(me.id)
  const done = isMissionDone(state, me.id)
  const totalDone = state.missionLogs.filter((l) => l.seniorId === me.id && l.missionId !== EXTRA_WATER).length
  const profile = state.profiles.find((p) => p.userId === me.id)
  const water = profile?.flowerWaterCount ?? 0
  const stage = [...STAGES].reverse().find((s) => water >= s.at)!
  const wateredToday = state.missionLogs.some((l) => l.seniorId === me.id && l.date === todayKey() && l.missionId === EXTRA_WATER)

  const action = () => {
    switch (mission.id) {
      case 'photo':
        return go('/photos/new')
      case 'message':
        return go('/connections')
      case 'song':
        return go('/answer/song')
      case 'recipe':
        return go('/recipes/new')
      case 'question':
        return go(`/answer/bank/${todaysQuestion(state, me.id).id}`)
      case 'water':
        return waterFlower()
    }
  }

  const waterFlower = () => {
    update((d) => {
      const p = d.profiles.find((x) => x.userId === me.id)
      if (p) p.flowerWaterCount += 1
      markMissionIfMatches(d, me.id, 'water')
      if (mission.id !== 'water') d.missionLogs.push({ seniorId: me.id, date: todayKey(), missionId: EXTRA_WATER, doneAt: Date.now() })
    })
    toast('お水をあげました 💧')
  }

  return (
    <Screen title="今日の役割" backTo="/">
      <Card tone="beige">
        <div className="mission-hero">{mission.emoji}</div>
        <h2 className="center">{mission.title}</h2>
        <p className="center muted">{mission.hint}</p>
        {done ? (
          <p className="done-note big">✓ 今日はできました。ありがとうございます！</p>
        ) : (
          <>
            {mission.id !== 'water' && <BigButton onClick={action}>はじめる</BigButton>}
            {mission.id === 'water' && <BigButton onClick={waterFlower}>🌷 水をあげる</BigButton>}
            <BigButton
              variant="ghost"
              onClick={() => {
                update((d) => {
                  d.missionLogs.push({ seniorId: me.id, date: todayKey(), missionId: mission.id, doneAt: Date.now() })
                })
                toast('できましたね！')
              }}
            >
              ✓ もうできた
            </BigButton>
          </>
        )}
        <p className="center small muted">できない日があっても大丈夫。また明日、新しい役割が届きます。</p>
      </Card>

      <Card tone="sage">
        <div className="card-label">🪴 わたしのお花</div>
        <div className="flower">{stage.emoji}</div>
        <p className="center">{stage.label}</p>
        <p className="center muted small">これまでに {water} 回 お水をあげました。忘れても枯れません。</p>
        {mission.id !== 'water' && !wateredToday && (
          <BigButton variant="secondary" onClick={waterFlower}>
            💧 水をあげる
          </BigButton>
        )}
      </Card>

      {totalDone > 0 && <p className="center muted">これまでに {totalDone} 回、役割をはたしました 👏</p>}
    </Screen>
  )
}
