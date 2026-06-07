import { useEffect, useState } from 'react'
import type { Exam, Task } from './types'
import { useStore } from './useStore'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { CountdownBar } from './components/Countdown'
import { Stats } from './components/Stats'
import { SubjectSettings } from './components/SubjectSettings'
import { Checklist } from './components/Checklist'
import { Calendar } from './components/Calendar'
import { TaskModal } from './components/TaskModal'
import { ExamModal } from './components/ExamModal'
import { LoginScreen } from './components/LoginScreen'
import { Marquee } from './components/Marquee'

export type View = 'board' | 'stats' | 'settings' | 'checklist' | 'calendar'

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('app:authenticated') === 'true'
  })

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('app:authenticated', 'true')
    } else {
      localStorage.removeItem('app:authenticated')
    }
  }, [isAuthenticated])

  // Hooks は常に同じ順序で呼ぶ（条件付き return の前に）
  const store = useStore()
  const { state, initialized } = store

  const [view, setView] = useState<View>('board')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  // 'new' = 新規作成 / Exam = 編集 / null = 閉じる
  const [examModal, setExamModal] = useState<'new' | Exam | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  // プルトゥリフレッシュ
  useEffect(() => {
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      // ページの上部でのタッチのみ
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY > 0) {
        const currentY = e.touches[0].clientY
        const distance = currentY - startY
        if (distance > 0) {
          setPullDistance(distance)
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance > 80) {
        setIsRefreshing(true)
        // Firebase から再読み込む
        try {
          await store.reloadFromFirebase()
        } catch (err) {
          console.error('Failed to refresh:', err)
        } finally {
          setIsRefreshing(false)
        }
      }
      setPullDistance(0)
      startY = 0
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, store])

  // 認証なければここで LoginScreen を返す
  if (!isAuthenticated) {
    return <LoginScreen onAuthenticate={() => setIsAuthenticated(true)} />
  }

  // Firebase からのデータ読み込み完了まで待つ
  if (!initialized) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="loading-message">データを読み込み中...</div>
      </div>
    )
  }

  // モーダル表示中のタスクは常に最新の state から取り直す
  const openTask: Task | null = openTaskId
    ? state.tasks.find((t) => t.id === openTaskId) ?? null
    : null

  return (
    <div className={`app theme-${state.theme}`}>
      {/* プルトゥリフレッシュ UI */}
      {pullDistance > 0 && (
        <div
          className="pull-to-refresh"
          style={{
            height: Math.min(pullDistance, 80),
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          <div className="pull-to-refresh__icon">⟳</div>
        </div>
      )}

      <Sidebar
        store={store}
        view={view}
        setView={setView}
        onNewExam={() => setExamModal('new')}
        onEditExam={(exam) => setExamModal(exam)}
        onLogout={() => setIsAuthenticated(false)}
      />

      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}>
            <h1 className="topbar__title">
              {view === 'board' ? '学習ボードあい' : view === 'stats' ? '統計' : view === 'settings' ? '各種設定' : view === 'checklist' ? '学習チェックリスト' : 'カレンダー'}
            </h1>
            <CountdownBar exams={state.exams} onEdit={(exam) => setExamModal(exam)} />
          </div>
          <Marquee config={state.marqueeConfig} />
        </div>

        {view === 'stats' ? (
          <Stats tasks={state.tasks} studyLog={state.studyLog} />
        ) : view === 'settings' ? (
          <SubjectSettings subjects={state.subjects} taskTypeMeta={state.taskTypeMeta} tasks={state.tasks} exams={state.exams} store={store} />
        ) : view === 'checklist' ? (
          <Checklist checklists={state.checklists} store={store} />
        ) : view === 'calendar' ? (
          <Calendar />
        ) : (
          <Board
            tasks={state.tasks}
            subjects={state.subjects}
            taskTypeMeta={state.taskTypeMeta}
            store={store}
            onOpenTask={(t) => setOpenTaskId(t.id)}
          />
        )}
      </main>

      {openTask && (
        <TaskModal
          task={openTask}
          subjects={state.subjects}
          taskTypeMeta={state.taskTypeMeta}
          store={store}
          onClose={() => setOpenTaskId(null)}
        />
      )}

      {examModal && (
        <ExamModal
          store={store}
          exam={examModal === 'new' ? null : examModal}
          onClose={() => setExamModal(null)}
        />
      )}
    </div>
  )
}
