import { useMemo, useState } from 'react'
import type { Store } from '../useStore'
import { todayStr, daysBetween } from '../utils'

interface GoalsPageProps {
  store: Store
}

export function GoalsPage({ store }: GoalsPageProps) {
  const { state } = store
  const [activeTab, setActiveTab] = useState<'achievement' | 'goals' | 'logs' | 'settings'>('achievement')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [fieldInput, setFieldInput] = useState<string>('')
  const [targetPageInput, setTargetPageInput] = useState<string>('')

  // --- タブ1: 到達度 ---
  const achievementData = useMemo(() => {
    const today = todayStr()

    // 各科目の累計問題数
    const subjectProblems: Record<string, number> = {}
    for (const log of state.logs) {
      if (!subjectProblems[log.subjectId]) subjectProblems[log.subjectId] = 0
      subjectProblems[log.subjectId] += log.problems
    }

    // 全体到達度
    const totalSubjectGoal = state.subjects.reduce((sum, s) => sum + (parseInt(s.color.match(/\d+/)?.[0] || '100') || 100), 0)
    // ※ color フィールドを goal に使う（暫定、後で専用フィールドに変更）
    const totalProblems = Object.values(subjectProblems).reduce((a, b) => a + b, 0)
    const overallAchievement = totalSubjectGoal === 0 ? 0 : Math.round((totalProblems / totalSubjectGoal) * 100)

    // 今月の問題数
    const currentMonth = today.slice(0, 7)
    const monthProblems = state.logs
      .filter((log) => log.date.startsWith(currentMonth))
      .reduce((sum, log) => sum + log.problems, 0)

    // 連続学習日数
    let consecutiveDays = 0
    let checkDate = new Date(today + 'T00:00:00')
    while (true) {
      const checkDateStr = todayStr(checkDate)
      const hasLog = state.logs.some((log) => log.date === checkDateStr)
      if (hasLog) {
        consecutiveDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // 科目別到達度
    const subjectAchievements = state.subjects.map((subject) => {
      const problems = subjectProblems[subject.id] || 0
      const goal = parseInt(subject.color.match(/\d+/)?.[0] || '100') || 100
      const rate = goal === 0 ? 100 : Math.round((problems / goal) * 100)
      return { subject, problems, goal, rate: Math.min(rate, 100) }
    })

    // 直近90日のヒートマップ
    const heatmapData: { date: string; problems: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - i)
      const ds = todayStr(d)
      const problems = state.logs.filter((log) => log.date === ds).reduce((sum, log) => sum + log.problems, 0)
      heatmapData.push({ date: ds, problems })
    }

    // 月目標の達成状況（直近3件）
    const monthGoalsList = Object.entries(state.monthGoals)
      .map(([month, goal]) => ({
        month,
        ...goal,
        achieved: state.logs
          .filter((log) => log.date.startsWith(month))
          .reduce((sum, log) => sum + log.problems, 0),
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 3)

    return {
      overallAchievement,
      totalProblems,
      monthProblems,
      consecutiveDays,
      subjectAchievements,
      heatmapData,
      monthGoalsList,
    }
  }, [state.logs, state.subjects, state.monthGoals])

  const heatColor = (problems: number) => {
    if (problems === 0) return 'var(--panel)'
    if (problems < 20) return '#bbf7d0'
    if (problems < 40) return '#4ade80'
    if (problems < 60) return '#22c55e'
    return '#15803d'
  }

  return (
    <div className="goals-page" style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('achievement')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'achievement' ? 'var(--accent)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: activeTab === 'achievement' ? '600' : '400',
          }}
        >
          到達度
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'goals' ? 'var(--accent)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: activeTab === 'goals' ? '600' : '400',
          }}
        >
          目標設定
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'logs' ? 'var(--accent)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: activeTab === 'logs' ? '600' : '400',
          }}
        >
          学習ログ
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'settings' ? 'var(--accent)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: activeTab === 'settings' ? '600' : '400',
          }}
        >
          科目・設定
        </button>
      </div>

      {/* タブ1: 到達度 */}
      {activeTab === 'achievement' && (
        <div>
          <h2 style={{ marginTop: 0 }}>📊 到達度</h2>

          {/* サマリー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '8px' }}>全体到達度</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6366f1' }}>{achievementData.overallAchievement}%</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '8px' }}>累計問題数</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{achievementData.totalProblems}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '8px' }}>今月の問題数</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{achievementData.monthProblems}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '8px' }}>連続学習日数</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{achievementData.consecutiveDays}日</div>
            </div>
          </div>

          {/* 科目別進捗 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>科目別の到達度</h3>
            {achievementData.subjectAchievements.length === 0 ? (
              <p style={{ color: 'var(--text-soft)' }}>科目がまだ登録されていません。</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {achievementData.subjectAchievements.map((item) => (
                  <div key={item.subject.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '600' }}>{item.subject.name}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-soft)' }}>
                        {item.problems} / {item.goal}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.rate}%`,
                          background: item.rate >= 100 ? '#10b981' : '#6366f1',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px', textAlign: 'right' }}>{item.rate}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 直近90日のヒートマップ */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>学習カレンダー（直近90日）</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
              {achievementData.heatmapData.map((item) => (
                <div
                  key={item.date}
                  style={{
                    width: '20px',
                    height: '20px',
                    background: heatColor(item.problems),
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title={`${item.date}: ${item.problems}問`}
                />
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
              少ない
              {[0, 20, 40, 60].map((n) => (
                <span key={n} style={{ display: 'inline-block', width: '16px', height: '16px', background: heatColor(n + 1), marginLeft: '4px', borderRadius: '2px' }} />
              ))}
              多い
            </div>
          </div>

          {/* 月目標の達成状況 */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>月目標の達成状況（直近3件）</h3>
            {achievementData.monthGoalsList.length === 0 ? (
              <p style={{ color: 'var(--text-soft)' }}>月目標がまだ設定されていません。</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {achievementData.monthGoalsList.map((goal) => (
                  <div key={goal.month}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '600' }}>{goal.month}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-soft)' }}>
                        {goal.achieved} / {goal.target}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min((goal.achieved / goal.target) * 100, 100)}%`,
                          background: goal.achieved >= goal.target ? '#10b981' : '#6366f1',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px', textAlign: 'right' }}>
                      {Math.round((goal.achieved / goal.target) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* タブ2: 目標設定 */}
      {activeTab === 'goals' && (
        <div>
          <h2 style={{ marginTop: 0 }}>🎯 目標設定</h2>
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', marginBottom: '24px' }}>
            <h3>新しい目標を追加</h3>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>科目</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                >
                  <option value="">選択してください</option>
                  {state.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>教材</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                >
                  <option value="">選択してください</option>
                  {state.taskTypeMeta.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>分野</label>
                <input
                  type="text"
                  value={fieldInput}
                  onChange={(e) => setFieldInput(e.target.value)}
                  placeholder="例：民法債権、行政法..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>目標到達ページ</label>
                <input
                  type="number"
                  value={targetPageInput}
                  onChange={(e) => setTargetPageInput(e.target.value)}
                  placeholder="例：100"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedSubject && selectedMaterial && fieldInput && targetPageInput) {
                  const month = todayStr().slice(0, 7)
                  store.addGoal(month, selectedSubject, selectedMaterial, fieldInput, parseInt(targetPageInput))
                  setSelectedSubject('')
                  setSelectedMaterial('')
                  setFieldInput('')
                  setTargetPageInput('')
                  alert('目標を追加しました！')
                }
              }}
              style={{ width: '100%', padding: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
            >
              目標を追加
            </button>
          </div>

          {/* 選択した教材のチェックリスト項目を表示 */}
          {selectedSubject && selectedMaterial && (
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
              <h3>学習チェックリスト（{state.subjects.find((s) => s.id === selectedSubject)?.name}）</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                {state.subjects.find((s) => s.id === selectedSubject)?.name} の「{state.taskTypeMeta.find((t) => t.key === selectedMaterial)?.label}」チェックリストがリンクされます。
              </p>
            </div>
          )}

          {/* 追加された目標の一覧 */}
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>登録済みの目標</h3>
            {state.goals.filter((g) => g.month === todayStr().slice(0, 7)).length === 0 ? (
              <p style={{ color: 'var(--text-soft)' }}>今月の目標が登録されていません。</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {state.goals
                  .filter((g) => g.month === todayStr().slice(0, 7))
                  .map((goal) => (
                    <div key={goal.id} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '600' }}>
                          {state.subjects.find((s) => s.id === goal.subjectId)?.name} / {state.taskTypeMeta.find((t) => t.key === goal.material)?.label} / {goal.field}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>目標：{goal.targetPage}ページ</div>
                      </div>
                      <button
                        onClick={() => store.deleteGoal(goal.id)}
                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        削除
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* タブ3, 4 は後で実装 */}
      {activeTab === 'logs' && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>学習ログ - 準備中</div>}
      {activeTab === 'settings' && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>科目・設定 - 準備中</div>}
    </div>
  )
}
