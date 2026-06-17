import { useMemo, useState } from 'react'
import type { Store } from '../useStore'
import { todayStr, daysBetween, uid } from '../utils'

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

  // Tab 3: 学習ログの入力フォーム
  const [logDate, setLogDate] = useState<string>(todayStr())
  const [logSubject, setLogSubject] = useState<string>('')
  const [logProblems, setLogProblems] = useState<string>('')
  const [logCorrect, setLogCorrect] = useState<string>('')
  const [logMemo, setLogMemo] = useState<string>('')

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

      {/* タブ3: 学習ログ */}
      {activeTab === 'logs' && (
        <div>
          <h2 style={{ marginTop: 0 }}>📝 学習ログ</h2>

          {/* ログ入力フォーム */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', marginBottom: '24px' }}>
            <h3>学習ログを追加</h3>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>日付</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>科目</label>
                <select
                  value={logSubject}
                  onChange={(e) => setLogSubject(e.target.value)}
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
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>問題数</label>
                <input
                  type="number"
                  value={logProblems}
                  onChange={(e) => setLogProblems(e.target.value)}
                  placeholder="例：50"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>正答数（任意）</label>
                <input
                  type="number"
                  value={logCorrect}
                  onChange={(e) => setLogCorrect(e.target.value)}
                  placeholder="例：45"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>メモ（任意）</label>
                <input
                  type="text"
                  value={logMemo}
                  onChange={(e) => setLogMemo(e.target.value)}
                  placeholder="例：民法の問題で引っかかった"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (logDate && logSubject && logProblems) {
                  store.addLog(logDate, logSubject, parseInt(logProblems), logCorrect ? parseInt(logCorrect) : undefined, logMemo || undefined)
                  setLogDate(todayStr())
                  setLogSubject('')
                  setLogProblems('')
                  setLogCorrect('')
                  setLogMemo('')
                  alert('学習ログを追加しました！')
                }
              }}
              style={{ width: '100%', padding: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
            >
              ログを追加
            </button>
          </div>

          {/* ログ一覧（日付降順） */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>学習ログ一覧</h3>
            {state.logs.length === 0 ? (
              <p style={{ color: 'var(--text-soft)' }}>学習ログがありません。</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>日付</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>科目</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>問題数</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>正答数</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>正答率</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>メモ</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...state.logs]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px' }}>{log.date}</td>
                          <td style={{ padding: '8px' }}>{state.subjects.find((s) => s.id === log.subjectId)?.name || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{log.problems}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{log.correct || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: log.correct ? '#10b981' : 'var(--text-soft)' }}>
                            {log.correct ? `${Math.round((log.correct / log.problems) * 100)}%` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontSize: '12px', color: 'var(--text-soft)' }}>{log.memo || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => store.deleteLog(log.id)}
                              style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* タブ4: 科目・設定 */}
      {activeTab === 'settings' && (
        <div>
          <h2 style={{ marginTop: 0 }}>⚙️ 科目・設定</h2>

          {/* 科目管理 */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', marginBottom: '24px' }}>
            <h3>科目管理</h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              {state.subjects.map((subject) => (
                <div key={subject.id} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '4px', display: 'grid', gridTemplateColumns: '1fr 100px 60px', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{subject.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
                      目標問題数：
                      <input
                        type="number"
                        defaultValue={parseInt(subject.color.match(/\d+/)?.[0] || '100')}
                        onBlur={(e) => {
                          const goal = parseInt(e.currentTarget.value) || 100
                          // 目標問題数を color フィールドに保存（暫定）
                          store.updateSubject(subject.id, { color: `#${goal.toString(16).padStart(6, '0')}` })
                        }}
                        style={{ width: '60px', padding: '4px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '12px', marginLeft: '4px' }}
                      />
                    </div>
                  </div>
                  <div style={{ width: '100px', height: '24px', background: subject.color, borderRadius: '4px' }} />
                  <button
                    onClick={() => store.deleteSubject(subject.id)}
                    style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 試験日管理 */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', marginBottom: '24px' }}>
            <h3>試験日管理</h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              {state.exams.map((exam) => (
                <div key={exam.id} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '20px', height: '20px', background: exam.color, borderRadius: '4px' }} />
                      {exam.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>日付：{exam.examDate}</div>
                  </div>
                  <button
                    onClick={() => store.deleteExam(exam.id)}
                    style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* データ操作 */}
          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px' }}>
            <h3>データ操作</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <button
                onClick={() => {
                  const json = JSON.stringify(state, null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `study-app-backup-${todayStr()}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{ padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                💾 JSON書き出し
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.json'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target?.result as string)
                          store.loadDataFromJSON(data)
                          alert('データを読み込みました！')
                        } catch {
                          alert('ファイルが壊れています')
                        }
                      }
                      reader.readAsText(file)
                    }
                  }
                  input.click()
                }}
                style={{ padding: '10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                📥 JSON読み込み
              </button>
              <button
                onClick={() => {
                  if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
                    store.deleteAllData()
                    alert('すべてのデータを削除しました。')
                  }
                }}
                style={{ padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                🗑️ 全削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
