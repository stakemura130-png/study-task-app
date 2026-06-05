import { useMemo } from 'react'
import type { StudyEntry, Status, Task } from '../types'
import { STATUS_META } from '../types'
import { formatMinutes, todayStr, daysBetween } from '../utils'

const STATUS_COLOR: Record<Status, string> = {
  todo: '#94a3b8',
  learning: '#0ea5e9',
  review: '#f59e0b',
  done: '#10b981',
}

interface StatsProps {
  tasks: Task[]
  studyLog: StudyEntry[]
}

export function Stats({ tasks, studyLog }: StatsProps) {
  // 日付ごとの合計（分）
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    if (Array.isArray(studyLog)) {
      for (const l of studyLog) m.set(l.date, (m.get(l.date) ?? 0) + l.minutes)
    }
    return m
  }, [studyLog])

  const total = tasks.length
  const counts: Record<Status, number> = { todo: 0, learning: 0, review: 0, done: 0 }
  for (const t of tasks) counts[t.status]++
  const doneRate = total === 0 ? 0 : Math.round((counts.done / total) * 100)

  const totalMinutes = useMemo(() => (Array.isArray(studyLog) ? studyLog.reduce((a, l) => a + l.minutes, 0) : 0), [studyLog])

  const today = todayStr()
  const weekMinutes = useMemo(
    () =>
      Array.isArray(studyLog)
        ? studyLog.reduce((a, l) => {
            const diff = daysBetween(l.date, today)
            return diff >= 0 && diff < 7 ? a + l.minutes : a
          }, 0)
        : 0,
    [studyLog, today],
  )

  // 直近7日間の棒グラフ
  const last7 = useMemo(() => {
    const arr: { label: string; date: string; minutes: number }[] = []
    const base = new Date(today + 'T00:00:00')
    const wk = ['日', '月', '火', '水', '木', '金', '土']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      const ds = todayStr(d)
      arr.push({ label: wk[d.getDay()], date: ds, minutes: byDate.get(ds) ?? 0 })
    }
    return arr
  }, [byDate, today])
  const maxBar = Math.max(60, ...last7.map((d) => d.minutes))

  // ヒートマップ（直近13週 = 91日、日曜始まり）
  const weeks = useMemo(() => {
    const base = new Date(today + 'T00:00:00')
    const end = new Date(base)
    end.setDate(base.getDate() + (6 - base.getDay()))
    const cols: { date: string; minutes: number }[][] = []
    for (let w = 12; w >= 0; w--) {
      const col: { date: string; minutes: number }[] = []
      for (let d = 0; d < 7; d++) {
        const cell = new Date(end)
        cell.setDate(end.getDate() - w * 7 - (6 - d))
        const ds = todayStr(cell)
        col.push({ date: ds, minutes: byDate.get(ds) ?? 0 })
      }
      cols.push(col)
    }
    return cols
  }, [byDate, today])

  const heatColor = (min: number) => {
    if (min <= 0) return 'var(--panel)'
    if (min < 30) return '#bbf7d0'
    if (min < 60) return '#4ade80'
    if (min < 120) return '#22c55e'
    return '#15803d'
  }

  return (
    <div className="stats">
      <h2 style={{ marginTop: 0 }}>📊 学習の進捗（全試験 共通）</h2>

      <div className="stats__grid">
        <div className="stat-card">
          <div className="stat-card__label">完了率</div>
          <div className="stat-card__value" style={{ color: '#6366f1' }}>
            {doneRate}%
          </div>
          <div className="stat-card__sub">
            {counts.done} / {total} タスク完了
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">学習中・復習</div>
          <div className="stat-card__value">{counts.learning + counts.review}</div>
          <div className="stat-card__sub">
            学習中 {counts.learning} ・ 復習 {counts.review}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">累計学習時間</div>
          <div className="stat-card__value">
            {Math.floor(totalMinutes / 60)}
            <small style={{ fontSize: 16 }}>時間</small>
          </div>
          <div className="stat-card__sub">{formatMinutes(totalMinutes)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">今週の学習</div>
          <div className="stat-card__value">{formatMinutes(weekMinutes)}</div>
          <div className="stat-card__sub">直近7日間の合計</div>
        </div>
      </div>

      <div className="panel">
        <h3>ステータス内訳</h3>
        {total === 0 ? (
          <p style={{ color: 'var(--text-soft)', margin: 0 }}>まだタスクがありません。</p>
        ) : (
          <>
            <div className="progress-track">
              {STATUS_META.map((m) =>
                counts[m.key] > 0 ? (
                  <div
                    key={m.key}
                    className="progress-seg"
                    style={{
                      width: `${(counts[m.key] / total) * 100}%`,
                      background: STATUS_COLOR[m.key],
                    }}
                    title={`${m.label}: ${counts[m.key]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="legend">
              {STATUS_META.map((m) => (
                <span key={m.key}>
                  <i style={{ background: STATUS_COLOR[m.key] }} />
                  {m.label} {counts[m.key]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h3>直近7日間の学習時間</h3>
        <div className="bars">
          {last7.map((d) => (
            <div className="bar-col" key={d.date}>
              <div className="bar-val">{d.minutes > 0 ? d.minutes : ''}</div>
              <div
                className="bar"
                style={{
                  height: `${(d.minutes / maxBar) * 100}%`,
                  background: d.minutes > 0 ? '#6366f1' : 'var(--border)',
                }}
              />
              <div className="bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>学習カレンダー（直近13週）</h3>
        <div className="heatmap">
          {weeks.map((col, i) => (
            <div className="heatmap__week" key={i}>
              {col.map((cell) => (
                <div
                  key={cell.date}
                  className="heatmap__cell"
                  style={{ background: heatColor(cell.minutes) }}
                  title={`${cell.date}：${formatMinutes(cell.minutes)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="heatmap__scale">
          少ない
          {['var(--panel)', '#bbf7d0', '#4ade80', '#22c55e', '#15803d'].map((c) => (
            <span
              key={c}
              className="heatmap__cell"
              style={{ background: c, width: 12, height: 12 }}
            />
          ))}
          多い
        </div>
      </div>
    </div>
  )
}
