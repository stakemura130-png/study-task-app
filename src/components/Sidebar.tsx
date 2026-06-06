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
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const date = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const dayName = dayNames[now.getDay()]

      setCurrentTime(`${year}-${month}-${date} ${dayName}曜日 ${hours}:${minutes}`)
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
      <div className="sidebar__brand">
        <div className="sidebar__logo">📚</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>学習タスク管理</div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginBottom: 12 }}>
            司法・予備・行政書士
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, lineHeight: 1.4 }}>
            {currentTime}
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
