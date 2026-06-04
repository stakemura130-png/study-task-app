import { useEffect, useState } from 'react'
import type { Exam } from '../types'

interface CountdownBarProps {
  exams: Exam[]
  onEdit: (exam: Exam) => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** すべての試験の残り時間を横並びで表示（試験日が近い順） */
export function CountdownBar({ exams, onEdit }: CountdownBarProps) {
  if (exams.length === 0) return null

  const sorted = [...exams].sort((a, b) => {
    if (!a.examDate) return 1
    if (!b.examDate) return -1
    return a.examDate < b.examDate ? -1 : 1
  })

  return (
    <div className="countdown-bar">
      {sorted.map((exam) => (
        <CountdownChip key={exam.id} exam={exam} />
      ))}
    </div>
  )
}

function CountdownChip({ exam }: { exam: Exam }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    const updateTime = () => {
      if (!exam.examDate) {
        setTimeLeft(null)
        return
      }

      const now = new Date()
      const examDate = new Date(exam.examDate + 'T00:00:00')
      const diff = examDate.getTime() - now.getTime()

      if (diff < 0) {
        setTimeLeft(null)
        return
      }

      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [exam.examDate])

  if (!timeLeft) {
    return (
      <div className="cd-chip">
        <span className="cd-chip__dot" style={{ background: exam.color }} />
        <span className="cd-chip__name">{exam.name}</span>
        <span className="cd-chip__sub">日付未設定</span>
      </div>
    )
  }

  const isUrgent = timeLeft.days <= 30

  // バッジSVGパスを取得
  const getBadgeSrc = (name: string) => {
    if (name.includes('行政書士')) return '/gyousei-badge.svg'
    if (name.includes('予備試験')) return '/bengoshi-badge.svg'
    if (name.includes('司法試験')) return '/shihousiken-badge.svg'
    return null
  }

  // 残り日数を「残り何ヵ月何日」フォーマットに変換
  const formatRemainingTime = (days: number) => {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30

    if (months > 0) {
      return `残り${months}ヵ月${remainingDays}日`
    }
    return `残り${days}日`
  }

  // 試験別の背景色（行政書士=紫、予備試験=ピンク）
  const getBgColor = (name: string) => {
    if (name.includes('行政書士')) return '#a78bfa'
    if (name.includes('予備試験')) return '#f472b6'
    return undefined
  }

  const bgColor = getBgColor(exam.name)

  // カスタムバッジイラストを優先、なければデフォルトバッジを使用
  const badgeSrc = exam.badgeImage || getBadgeSrc(exam.name)

  return (
    <div
      className={`cd-chip${isUrgent ? ' cd-chip--urgent' : ''}`}
      style={bgColor ? { background: bgColor, color: '#fff', borderColor: bgColor } : undefined}
    >
      {badgeSrc ? (
        <img src={badgeSrc} alt={exam.name} className="cd-chip__badge-img" />
      ) : (
        <span className="cd-chip__badge">📅</span>
      )}
      <div className="cd-chip__content">
        <span className="cd-chip__name">{exam.name}</span>
        <span className="cd-chip__countdown">
          残り<span className="cd-chip__days">{timeLeft.days}</span>日
          {isUrgent && <span className="cd-chip__hours"> {timeLeft.hours}時間</span>}
        </span>
        <span className="cd-chip__date">{formatRemainingTime(timeLeft.days)}</span>
      </div>
    </div>
  )
}
