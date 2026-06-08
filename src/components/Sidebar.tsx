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
              title="最新データを取得"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))',
                backdropFilter: 'blur(10px)',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                color: isRefreshing ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                fontWeight: '600',
                opacity: 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.5))'
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(99, 102, 241, 0.4)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {isRefreshing ? '更新中...' : 'Reload'}
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
