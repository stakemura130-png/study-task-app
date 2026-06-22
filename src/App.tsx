import { useEffect, useState } from 'react'
import type { Exam, Task } from './types'
import { useStore } from './useStore'
import { todayStr } from './utils'
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

export type View = 'board' | 'tasks' | 'stats' | 'settings' | 'checklist' | 'calendar' | 'timer'

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
  // アラートメッセージと次のゴールの交互表示用
  const [showAlertMessage, setShowAlertMessage] = useState(false)

  // URL パラメータから userId を読み込み
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userIdFromUrl = params.get('userId')
    if (userIdFromUrl) {
      localStorage.setItem('app:userId', userIdFromUrl)
    }
  }, [])

  // アラートメッセージと次のゴール表示を10秒ごとに切り替え
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAlertMessage((prev) => !prev)
    }, 10000)
    return () => clearInterval(interval)
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
                ? 'ダッシュボード'
                : view === 'tasks'
                  ? 'タスク管理'
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
        ) : view === 'tasks' ? (
          <Board
            tasks={state.tasks}
            subjects={state.subjects}
            taskTypeMeta={state.taskTypeMeta}
            store={store}
            onOpenTask={(t) => setOpenTaskId(t.id)}
          />
        ) : (
          <>
            <div style={{ padding: '0 28px', borderBottom: '1px solid var(--border-color)', marginLeft: '0', marginRight: '0', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0', marginBottom: '0' }}>
                <div style={{ padding: '0', background: 'var(--card-bg)', borderRadius: '0', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  {(() => {
                    // 期日が有効なゴールのみを対象（月でフィルターしない）
                    const validGoals = state.goals.filter((goal) => {
                      const end = new Date(goal.endDate)
                      const today = new Date(todayStr())
                      return end.getTime() > today.getTime()
                    })

                    // 科目ごとにグループ化
                    const groupedBySubject: Record<string, typeof validGoals> = {}
                    validGoals.forEach((goal) => {
                      if (!groupedBySubject[goal.subjectId]) {
                        groupedBySubject[goal.subjectId] = []
                      }
                      groupedBySubject[goal.subjectId].push(goal)
                    })

                    // 科目別に達成状況を計算
                    const getAchieved = (subjectId: string) => {
                      const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
                      return state.logs
                        .filter((log) => log.subjectId === subjectId && log.date.startsWith(currentMonth))
                        .reduce((sum, log) => sum + log.problems, 0)
                    }

                    return (
                      <div style={{ padding: '0' }}>
                        {/* 今週の目標 - 2列グリッド */}
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>📅 今週の目標</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {state.subjects.map((subject) => {
                              const allGoals = groupedBySubject[subject.id] || []

                              // 期日が有効なゴール
                              const upcomingGoals = allGoals
                                .filter((goal) => {
                                  const end = new Date(goal.endDate)
                                  const today = new Date(todayStr())
                                  return end.getTime() > today.getTime()
                                })
                                .sort((a, b) => {
                                  const aEnd = new Date(a.endDate)
                                  const bEnd = new Date(b.endDate)
                                  return aEnd.getTime() - bEnd.getTime()
                                })

                              // 期日3日以下のゴール
                              const alertGoals = upcomingGoals.filter((goal) => {
                                const end = new Date(goal.endDate)
                                const today = new Date(todayStr())
                                const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                return days <= 3 && days >= 0
                              })

                              // マルキーに表示するゴール（期日3日以下のもの）
                              const currentDisplayedGoal = alertGoals.length > 0 ? alertGoals[0] : null

                              // 目標一覧：currentDisplayedGoal を除外
                              const goals = upcomingGoals.filter((goal) => goal.id !== currentDisplayedGoal?.id)
                              const totalTarget = upcomingGoals.reduce((sum, g) => sum + g.targetPage, 0)
                              const achieved = getAchieved(subject.id)

                              return (
                                <div key={subject.id} style={{ background: '#1a1a1a', border: `3px solid ${subject.color}`, borderRadius: '8px', overflow: 'hidden' }}>
                                  {/* 科目ヘッダー - 電光掲示板風 */}
                                  <div style={{
                                    background: subject.color,
                                    color: '#000',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: '700',
                                    fontSize: '18px',
                                    letterSpacing: '0.5px',
                                  }}>
                                    <div>{subject.name}</div>
                                    <div style={{ fontSize: '14px' }}>
                                      {achieved}/{totalTarget}
                                    </div>
                                  </div>

                                  {/* 目標一覧 */}
                                  {goals.length === 0 ? (
                                    <div style={{ padding: '12px', color: 'var(--text-soft)', fontSize: '12px', textAlign: 'center' }}>
                                      -
                                    </div>
                                  ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', background: '#1a1a1a' }}>
                                      <tbody>
                                        {goals.map((goal, idx) => {
                                          const getRemainingDays = () => {
                                            const end = new Date(goal.endDate)
                                            const today = new Date(todayStr())
                                            const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                            return Math.max(0, days)
                                          }
                                          const remaining = getRemainingDays()
                                          return (
                                            <tr key={goal.id} style={{ borderBottom: `1px solid ${subject.color}20`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                              <td style={{ padding: '10px 12px', color: 'white', fontSize: '18px', fontWeight: '700', flex: 1 }}>
                                                {goal.field}
                                              </td>
                                              <td style={{ padding: '10px 8px', fontSize: '18px', fontWeight: '700', minWidth: '80px' }}>
                                                <span style={{ color: 'white' }}>残り</span>
                                                <span style={{ color: remaining <= 3 ? '#ff4444' : '#ffa500', fontWeight: '700' }}>{remaining}</span>
                                                <span style={{ color: 'white' }}>日</span>
                                              </td>
                                              <td style={{ padding: '10px 8px', color: 'white', fontSize: '18px', fontWeight: '700' }}>
                                                {state.taskTypeMeta.find((t) => t.key === goal.material)?.label || goal.material}
                                              </td>
                                              <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '18px', fontWeight: '700' }}>
                                                <span style={{ color: '#ffa500', fontWeight: '700' }}>{goal.targetPage}</span>
                                                <span style={{ color: 'white', marginLeft: '4px' }}>ページまで</span>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  )}

                                  {/* 追加の次のゴール表示 */}
                                  {(() => {
                                    const upcomingGoals = goals
                                      .filter((goal) => {
                                        const end = new Date(goal.endDate)
                                        const today = new Date(todayStr())
                                        return end.getTime() > today.getTime()
                                      })
                                      .sort((a, b) => {
                                        const aEnd = new Date(a.endDate)
                                        const bEnd = new Date(b.endDate)
                                        return aEnd.getTime() - bEnd.getTime()
                                      })
                                    const additionalGoals = upcomingGoals.slice(1)

                                    if (additionalGoals.length === 0) return null

                                    return (
                                      <div style={{ display: 'grid', gap: '8px' }}>
                                        {additionalGoals.map((goal, idx) => {
                                          const getRemainingDays = () => {
                                            const end = new Date(goal.endDate)
                                            const today = new Date(todayStr())
                                            const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                            return Math.max(0, days)
                                          }
                                          const remaining = getRemainingDays()
                                          return (
                                            <div key={goal.id} style={{
                                              marginTop: idx === 0 ? '8px' : '0',
                                              padding: '8px 10px',
                                              background: '#1a1a1a',
                                              border: `2px solid ${subject.color}`,
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                            }}>
                                              <div style={{
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                color: subject.color,
                                                marginRight: '8px',
                                                letterSpacing: '1px',
                                                whiteSpace: 'nowrap',
                                              }}>
                                                NEXT
                                              </div>
                                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#1a1a1a' }}>
                                                <tbody>
                                                  <tr>
                                                    <td style={{ padding: '0 4px', color: 'white', fontSize: '13px', fontWeight: '600', flex: 1 }}>
                                                      {goal.field}
                                                    </td>
                                                    <td style={{ padding: '0 4px', fontSize: '13px', fontWeight: '600', minWidth: '55px' }}>
                                                      <span style={{ color: 'white' }}>残り</span>
                                                      <span style={{ color: remaining <= 3 ? '#ff4444' : '#ffa500', fontWeight: '700', marginLeft: '2px' }}>{remaining}</span>
                                                      <span style={{ color: 'white' }}>日</span>
                                                    </td>
                                                    <td style={{ padding: '0 4px', color: 'white', fontSize: '12px', fontWeight: '600' }}>
                                                      {state.taskTypeMeta.find((t) => t.key === goal.material)?.label || goal.material}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '0 4px', fontSize: '13px', fontWeight: '600' }}>
                                                      <span style={{ color: '#ffa500', fontWeight: '700' }}>{goal.targetPage}</span>
                                                      <span style={{ color: 'white', marginLeft: '2px' }}>ページまで</span>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  })()}

                                  {/* ゴールアラート用マルキー（アラートメッセージとNEXT目標の交互表示） */}
                                  {(() => {
                                    // currentDisplayedGoal がない場合はマルキー不要
                                    if (!currentDisplayedGoal) return null

                                    const alertMessage = state.goalAlertMessages[subject.id]
                                    const nextGoal = goals.length > 0 ? goals[0] : null
                                    const hasNextGoal = nextGoal != null
                                    const hasAlertMessage = !!alertMessage

                                    // 両方ある場合は交互表示、片方だけの場合はそれを表示
                                    const displayNextGoal = hasNextGoal && hasAlertMessage ? !showAlertMessage : hasNextGoal

                                    if (displayNextGoal && nextGoal) {
                                      const getRemainingDays = () => {
                                        const end = new Date(nextGoal.endDate)
                                        const today = new Date(todayStr())
                                        const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                                        return Math.max(0, days)
                                      }
                                      const remaining = getRemainingDays()
                                      return (
                                        <div style={{
                                          marginTop: '8px',
                                          padding: '8px 10px',
                                          background: '#1a1a1a',
                                          border: `2px solid ${subject.color}`,
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}>
                                          <div style={{
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            color: subject.color,
                                            marginRight: '8px',
                                            letterSpacing: '1px',
                                            whiteSpace: 'nowrap',
                                          }}>
                                            NEXT
                                          </div>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#1a1a1a' }}>
                                            <tbody>
                                              <tr>
                                                <td style={{ padding: '0 4px', color: 'white', fontSize: '13px', fontWeight: '600', flex: 1 }}>
                                                  {nextGoal.field}
                                                </td>
                                                <td style={{ padding: '0 4px', fontSize: '13px', fontWeight: '600', minWidth: '55px' }}>
                                                  <span style={{ color: 'white' }}>残り</span>
                                                  <span style={{ color: remaining <= 3 ? '#ff4444' : '#ffa500', fontWeight: '700', marginLeft: '2px' }}>{remaining}</span>
                                                  <span style={{ color: 'white' }}>日</span>
                                                </td>
                                                <td style={{ padding: '0 4px', color: 'white', fontSize: '12px', fontWeight: '600' }}>
                                                  {state.taskTypeMeta.find((t) => t.key === nextGoal.material)?.label || nextGoal.material}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '0 4px', fontSize: '13px', fontWeight: '600' }}>
                                                  <span style={{ color: '#ffa500', fontWeight: '700' }}>{nextGoal.targetPage}</span>
                                                  <span style={{ color: 'white', marginLeft: '2px' }}>ページまで</span>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      )
                                    }

                                    return (
                                      <div style={{
                                        marginTop: '8px',
                                        padding: '8px 10px',
                                        background: '#1a1a1a',
                                        border: `2px solid ${subject.color}`,
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                      }}>
                                        {hasAlertMessage ? (
                                          <div style={{
                                            whiteSpace: 'nowrap',
                                            animation: 'blink 0.8s ease-in-out infinite',
                                            color: '#ff0000',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            letterSpacing: '2px',
                                          }}>
                                            {'💡 ' + alertMessage + ' 💡'}
                                          </div>
                                        ) : (
                                          <div style={{
                                            color: subject.color,
                                            fontSize: '13px',
                                            opacity: 0.4,
                                          }}>
                                            —
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}

                                </div>
                              )
                            })}
                          </div>
                        </div>

                      </div>
                    )
                  })()}
                </div>
              </div>

            </div>
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
