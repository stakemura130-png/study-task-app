import { useEffect, useState } from 'react'
import type { Exam, Task } from './types'
import { useStore } from './useStore'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { CountdownBar } from './components/Countdown'
import { Stats } from './components/Stats'
import { SubjectSettings } from './components/SubjectSettings'
import { Checklist } from './components/Checklist'
import { TaskModal } from './components/TaskModal'
import { ExamModal } from './components/ExamModal'
import { LoginScreen } from './components/LoginScreen'
import { Marquee } from './components/Marquee'

export type View = 'board' | 'stats' | 'settings' | 'checklist'

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

  // 認証なければここで LoginScreen を返す
  if (!isAuthenticated) {
    return <LoginScreen onAuthenticate={() => setIsAuthenticated(true)} />
  }

  // Firebase からのデータ読み込み完了まで待つ
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        gap: '24px',
      }}>
        {/* スピナー */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '4px solid var(--text-soft)',
          borderTopColor: 'var(--text)',
          animation: 'spin 1s linear infinite',
        }} />
        {/* メッセージ */}
        <div style={{
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          animation: 'fadeInOut 2s ease-in-out infinite',
        }}>
          データを読み込み中...
        </div>
        {/* CSS アニメーション定義 */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // モーダル表示中のタスクは常に最新の state から取り直す
  const openTask: Task | null = openTaskId
    ? state.tasks.find((t) => t.id === openTaskId) ?? null
    : null

  return (
    <div className={`app theme-${state.theme}`}>
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
          <h1 className="topbar__title">
            {view === 'board' ? '学習ボード' : view === 'stats' ? '統計' : view === 'settings' ? '各種設定' : '学習チェックリスト'}
          </h1>
          <Marquee />
          <CountdownBar exams={state.exams} onEdit={(exam) => setExamModal(exam)} />
        </div>

        {view === 'stats' ? (
          <Stats tasks={state.tasks} studyLog={state.studyLog} />
        ) : view === 'settings' ? (
          <SubjectSettings subjects={state.subjects} taskTypeMeta={state.taskTypeMeta} tasks={state.tasks} exams={state.exams} store={store} />
        ) : view === 'checklist' ? (
          <Checklist checklists={state.checklists} store={store} />
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
