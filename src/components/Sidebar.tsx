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
          学習タスク管理
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
            司法・予備・行政書士
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
            {menu.key === 'checklist' && '✓'} {menu.label}
          </button>
        ))}

      <div className="sidebar__section">
        <span>試験日</span>
        <button
          onClick={onNewExam}
          title="試験日を追加"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ＋
        </button>
      </div>
      {sortedExams.map((exam) => {
        const days = daysUntilExam(exam.examDate)
        return (
          <button key={exam.id} className="exam-item" onClick={() => onEditExam(exam)}>
            <span className="exam-item__dot" style={{ background: exam.color }} />
            <span className="exam-item__name">{exam.name}</span>
            {days !== null && (
              <span className="exam-item__days">
                {days > 0 ? `${days}日` : days === 0 ? '本番' : '済'}
              </span>
            )}
          </button>
        )
      })}

      <button className="sidebar__add" onClick={onNewExam}>
        ＋ 試験日を追加
      </button>

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
