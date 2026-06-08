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
  onRefresh?: () => Promise<void>
}

export function Sidebar({
  store,
  view,
  setView,
  onNewExam,
  onEditExam,
  onLogout,
  onRefresh,
}: SidebarProps) {
  const { state } = store
  const [currentTime, setCurrentTime] = useState({ date: '', time: '' })
  const [isRefreshing, setIsRefreshing] = useState(false)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
          <div style={{ fontSize: 32, lineHeight: 1, marginRight: 2 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>学習タスク管理</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <div className="time-display">
            <div className="time-display__date">{currentTime.date}</div>
            <div className="time-display__time">{currentTime.time}</div>
          </div>
          {onRefresh && (
            <button
              onClick={async () => {
                setIsRefreshing(true)
                try {
                  await onRefresh()
                } catch (err) {
                  console.error('Failed to refresh:', err)
                } finally {
                  setIsRefreshing(false)
                }
              }}
              disabled={isRefreshing}
              title="Firebaseから最新データを取得"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '16px',
                opacity: isRefreshing ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
              }}
            >
              {isRefreshing ? '⟳' : '🔄'}
            </button>
          )}
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
            {menu.key === 'checklist' && '✓'} {menu.key === 'calendar' && '📅'} {menu.key === 'timer' && '⏱'}{' '}
            {menu.label}
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
