import { useEffect, useState } from 'react'
import type { Exam, Task } from './types'
import { useStore } from './useStore'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { CountdownBar } from './components/Countdown'
import { GoalsPage } from './components/GoalsPage'
import { SubjectSettings } from './components/SubjectSettings'
import { Checklist } from './components/Checklist'
import { Calendar } from './components/Calendar'
import { PomodoroTimer } from './components/PomodoroTimer'
import { TaskModal } from './components/TaskModal'
import { ExamModal } from './components/ExamModal'
import { LoginScreen } from './components/LoginScreen'
import { Marquee } from './components/Marquee'

export type View = 'board' | 'stats' | 'settings' | 'checklist' | 'calendar' | 'timer'

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
  const [pullDistance, setPullDistance] = useState(0)

  // URL パラメータから userId を読み込み
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userIdFromUrl = params.get('userId')
    if (userIdFromUrl) {
      localStorage.setItem('app:userId', userIdFromUrl)
    }
  }, [])

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
        // Firebase から再読み込む
        try {
          await store.reloadFromFirebase()
        } catch (err) {
          console.error('Failed to refresh:', err)
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
        onRefresh={async () => {
          try {
            // 1. Save current state to localStorage immediately (as backup)
            console.log('[Reload] Saving current state to localStorage...')
            localStorage.setItem('study-task-app:v3', JSON.stringify(state))
            console.log('[Reload] State saved to localStorage')

            // 2. Reload latest data from Firebase
            console.log('[Reload] Reloading from Firebase...')
            await store.reloadFromFirebase()
            console.log('[Reload] Successfully reloaded from Firebase')
          } catch (err) {
            console.error('Failed to refresh:', err)
          }
        }}
      />

      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}>
            <h1 className="topbar__title">
              {view === 'board'
                ? '学習ボード'
                : view === 'stats'
                  ? '目標・到達度'
                  : view === 'settings'
                    ? '各種設定'
                    : view === 'checklist'
                      ? '学習チェックリスト'
                      : view === 'timer'
                        ? 'ポモドーロタイマー'
                        : 'カレンダー'}
            </h1>
            <CountdownBar exams={state.exams} onEdit={(exam) => setExamModal(exam)} />
          </div>
          <Marquee config={state.marqueeConfig} />
        </div>

        {view === 'stats' ? (
          <GoalsPage store={store} />
        ) : view === 'settings' ? (
          <SubjectSettings subjects={state.subjects} taskTypeMeta={state.taskTypeMeta} tasks={state.tasks} exams={state.exams} store={store} />
        ) : view === 'checklist' ? (
          <Checklist checklists={state.checklists} store={store} />
        ) : view === 'timer' ? (
          <PomodoroTimer store={store} />
        ) : view === 'calendar' ? (
          <Calendar />
        ) : (
          <>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>📅 今週の目標</h3>
                  {state.weekGoals?.focus && state.weekGoals.focus.length > 0 ? (
                    <>
                      <div style={{ marginBottom: '8px' }}>
                        {state.weekGoals.focus.map((f, i) => (
                          <span key={i} style={{ display: 'inline-block', background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '6px', marginRight: '6px', marginBottom: '4px', fontSize: '12px' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                      {state.weekGoals.note && <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>📝 {state.weekGoals.note}</p>}
                    </>
                  ) : (
                    <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>目標を設定してください</p>
                  )}
                </div>

                <div style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>🎯 今月の目標</h3>
                  {(() => {
                    const now = new Date()
                    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                    const monthGoal = state.monthGoals[monthKey]
                    return monthGoal ? (
                      <div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>{monthGoal.text}</p>
                        <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>目標: {monthGoal.target} 問</p>
                      </div>
                    ) : (
                      <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>目標を設定してください</p>
                    )
                  })()}
                </div>
              </div>

              <div style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>📊 日次ノルマ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>平日</p>
                    <p style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: 'var(--primary-color)' }}>{state.quota.weekday} 問</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>休日</p>
                    <p style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#10b981' }}>{state.quota.weekend} 問</p>
                  </div>
                </div>
              </div>
            </div>

            <Board
              tasks={state.tasks}
              subjects={state.subjects}
              taskTypeMeta={state.taskTypeMeta}
              store={store}
              onOpenTask={(t) => setOpenTaskId(t.id)}
            />
          </>
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
