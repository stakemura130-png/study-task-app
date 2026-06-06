import { useEffect, useState } from 'react'
import type { Exam } from '../types'
import type { Store } from '../useStore'
import type { View } from '../App'
import { daysUntilExam } from '../utils'

interface SidebarProps {
  store: Store
  view: View
  setView: (v: View) => void
  onNewExam: () => void
  onEditExam: (exam: Exam) => void
  onLogout: () => void
}

export function Sidebar({
  store,
  view,
  setView,
  onNewExam,
  onEditExam,
  onLogout,
}: SidebarProps) {
  const { state } = store
  const [currentTime, setCurrentTime] = useState({ date: '', time: '' })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const date = now.getDate()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const dayName = dayNames[now.getDay()]

      const dateStr = `${year}年${month}月${date}日(${dayName})`
      const timeStr = `${hours}：${minutes}`
      setCurrentTime({ date: dateStr, time: timeStr })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const sortedExams = [...state.exams].sort((a, b) => {
    if (!a.examDate) return 1
    if (!b.examDate) return -1
    return a.examDate < b.examDate ? -1 : 1
  })

  return (
    <aside className="sidebar">
      <div className="sidebar__brand" style={{ flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
          <div style={{ fontSize: 32, lineHeight: 1, marginRight: 2 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>学習タスク管理</div>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginBottom: 14, marginLeft: 40, lineHeight: 1.2 }}>
          司法・予備・行政書士
        </div>
        <div
          style={{
            fontFamily: "'SF Mono', Monaco, monospace",
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, letterSpacing: '0.5px', marginBottom: 6 }}>
            {currentTime.date}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#6366f1', letterSpacing: '1px', fontVariantNumeric: 'tabular-nums' }}>
            {currentTime.time}
          </div>
        </div>
      </div>

      <div className="sidebar__section">メニュー</div>
      {[...state.menuConfig]
        .filter((m) => m.visible)
        .sort((a, b) => a.order - b.order)
        .map((menu) => (
          <button
            key={menu.key}
            className={`nav-btn${view === menu.key ? ' active' : ''}`}
            onClick={() => setView(menu.key as View)}
          >
            {menu.key === 'board' && '🗂'} {menu.key === 'stats' && '📊'} {menu.key === 'settings' && '⚙'}{' '}
            {menu.key === 'checklist' && '✓'} {menu.key === 'calendar' && '📅'} {menu.label}
          </button>
        ))}


      <button
        className="sidebar__logout"
        onClick={() => {
          if (confirm('ログアウトしますか？')) onLogout()
        }}
      >
        🔒 ログアウト
      </button>
    </aside>
  )
}
