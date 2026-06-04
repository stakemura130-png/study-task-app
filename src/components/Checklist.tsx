import { useState } from 'react'
import type { ChecklistItem, ChecklistSubject } from '../types'
import { CHECKLIST_SUBJECTS } from '../types'
import type { Store } from '../useStore'

interface ChecklistProps {
  checklists: Record<ChecklistSubject, ChecklistItem[]>
  store: Store
}

export function Checklist({ checklists, store }: ChecklistProps) {
  const [selectedSubject, setSelectedSubject] = useState<ChecklistSubject>('minpou1')
  const [filter, setFilter] = useState<'all' | 'checked' | 'unchecked'>('all')
  const [memoEditId, setMemoEditId] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [csvInputOpen, setCsvInputOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [expandedAttempts, setExpandedAttempts] = useState<string | null>(null)

  // 科目ごとの番号オフセット
  const subjectStartNumbers: Record<string, number> = {
    minpou1: 1,
    minpou2: 313,
    keihoi: 1,
    kenshou: 1,
    gyousei: 1,
    shougou: 1,
    minjisoshou: 1,
    keijisoshou: 1,
    ippanchiski: 1,
  }

  const currentChecklist = checklists[selectedSubject] || []
  const filteredItems = currentChecklist.filter((item) => {
    if (filter === 'checked') return item.checked
    if (filter === 'unchecked') return !item.checked
    return true
  })

  const checkedCount = currentChecklist.filter((item) => item.checked).length
  const totalCount = currentChecklist.length
  const completionRate = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // 正答率（〇と△の合計）と完全正答率（〇のみ）を計算
  const calculateSuccessRate = () => {
    const allAttempts: string[] = []
    currentChecklist.forEach((item) => {
      if (item.memo) {
        allAttempts.push(...item.memo.split(',').filter((m) => m.match(/[○△✖]/)))
      }
    })
    const successAttempts = allAttempts.filter((status) => status === '○' || status === '△')
    const perfectAttempts = allAttempts.filter((status) => status === '○')
    return {
      allAttempts,
      successAttempts,
      successRate: allAttempts.length > 0 ? Math.round((successAttempts.length / allAttempts.length) * 100) : 0,
      perfectAttempts,
      perfectRate: allAttempts.length > 0 ? Math.round((perfectAttempts.length / allAttempts.length) * 100) : 0,
    }
  }
  const { allAttempts, successAttempts, successRate, perfectAttempts, perfectRate } = calculateSuccessRate()

  const openMemoEdit = (item: ChecklistItem) => {
    setMemoEditId(item.id)
    setMemoText(item.memo)
  }

  const saveMemo = (id: string) => {
    store.updateChecklistItem(selectedSubject, id, { memo: memoText })
    setMemoEditId(null)
    setMemoText('')
  }

  const parseCSV = (csv: string) => {
    try {
      const lines = csv.trim().split('\n')
      const items: ChecklistItem[] = []
      let isExcelFormat = false
      let delimiter = ',' // デフォルトはカンマ

      for (let i = 0; i < lines.length; i++) {
        // 空行は無視
        if (!lines[i].trim()) continue

        // 最初の行で区切り文字を判定
        if (i === 0) {
          if (lines[i].includes('\t')) {
            delimiter = '\t' // タブ区切り
          }
        }

        const parts = lines[i].split(delimiter).map((s) => s.trim())
        if (parts.length < 3) continue

        // 最初の行で形式を判定（№や番号が最初の列の場合）
        if (i === 0 && (parts[0].match(/^[№№]$/) || parts[0].match(/^[\d]+$/) && parts.length >= 4)) {
          isExcelFormat = true
        }

        // ヘッダー行をスキップ
        if (i === 0 && (parts[0].includes('問題番号') || parts[0] === '№' || parts[0] === 'No')) {
          continue
        }

        // 形式に応じて列を割り当て
        let questionNumber, theme, correctRateStr

        if (isExcelFormat) {
          // [番号, 問題番号, テーマ, 正答率, ...]
          questionNumber = parts[1]
          theme = parts[2]
          correctRateStr = parts[3]
        } else {
          // [問題番号, テーマ, 正答率, ...]
          questionNumber = parts[0]
          theme = parts[1]
          correctRateStr = parts[2]
        }

        // パーセント記号を除去して数値に変換
        const correctRate = parseInt(correctRateStr.replace('%', ''), 10)

        if (questionNumber && theme && !isNaN(correctRate)) {
          items.push({
            id: Math.random().toString(36).substring(7),
            questionNumber,
            theme,
            correctRate,
            checked: false,
            memo: '',
            notes: '',
            isNextStart: false,
          })
        }
      }

      return items
    } catch {
      alert('CSVの形式が正しくありません。\n形式：問題番号,テーマ,正答率\n（タブ区切り・カンマ区切り両対応、パーセント記号は自動で削除）')
      return []
    }
  }

  const handlePasteCSV = () => {
    const parsed = parseCSV(csvText)
    if (parsed.length > 0) {
      store.replaceChecklistData(selectedSubject, parsed)
      setCsvText('')
      setCsvInputOpen(false)
      alert(`${parsed.length}件のデータを読み込みました`)
    }
  }

  // 科目の色分け設定を取得
  const colorSettings = checklists && selectedSubject in (checklists as any)
    ? store.state.checklistColorThresholds[selectedSubject] || {
        excellentThreshold: 80,
        goodThreshold: 60,
        excellentColor: '#ec4899',
        goodColor: '#f59e0b',
        poorColor: '#000000',
      }
    : { excellentThreshold: 80, goodThreshold: 60, excellentColor: '#ec4899', goodColor: '#f59e0b', poorColor: '#000000' }

  const getCorrectRateColor = (rate: number) => {
    if (rate >= colorSettings.excellentThreshold) return colorSettings.excellentColor
    if (rate >= colorSettings.goodThreshold) return colorSettings.goodColor
    return 'var(--text)'
  }

  const getCorrectRateBgColor = (rate: number) => {
    if (rate >= colorSettings.excellentThreshold) {
      const color = colorSettings.excellentColor
      return color.startsWith('#') ? `${color}1a` : color.replace(/[0-9.]+\)/, '0.1)')
    }
    if (rate >= colorSettings.goodThreshold) {
      const color = colorSettings.goodColor
      return color.startsWith('#') ? `${color}1a` : color.replace(/[0-9.]+\)/, '0.1)')
    }
    return 'rgba(0, 0, 0, 0.15)'
  }

  // メモを試行結果リストとして取得
  const getAttempts = (memo: string) => {
    if (!memo) return []
    return memo.split(',').filter((m) => m.match(/[○△✖]/))
  }

  // メモに試行結果を追加
  const addAttempt = (id: string, status: '○' | '△' | '✖') => {
    const item = currentChecklist.find((i) => i.id === id)
    if (!item) return
    const attempts = getAttempts(item.memo)
    attempts.push(status)
    const newMemo = attempts.join(',')
    store.updateChecklistItem(selectedSubject, id, { memo: newMemo })
  }

  // メモから試行結果を削除
  const removeAttempt = (id: string, index: number) => {
    const item = currentChecklist.find((i) => i.id === id)
    if (!item) return
    const attempts = getAttempts(item.memo)
    attempts.splice(index, 1)
    const newMemo = attempts.join(',')
    store.updateChecklistItem(selectedSubject, id, { memo: newMemo })
  }

  // 次回開始マークを設定
  const setNextStart = (id: string) => {
    const item = currentChecklist.find((i) => i.id === id)
    if (!item) return
    const newValue = !item.isNextStart
    // 全項目を更新
    currentChecklist.forEach((i) => {
      if (i.id === id) {
        store.updateChecklistItem(selectedSubject, i.id, { isNextStart: newValue, checked: i.checked, memo: i.memo, notes: i.notes })
      } else if (i.isNextStart) {
        store.updateChecklistItem(selectedSubject, i.id, { isNextStart: false, checked: i.checked, memo: i.memo, notes: i.notes })
      }
    })
  }

  // 引継ぎ情報を編集
  const [notesEditId, setNotesEditId] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')

  const openNotesEdit = (item: ChecklistItem) => {
    setNotesEditId(item.id)
    setNotesText(item.notes)
  }

  const saveNotes = (id: string) => {
    store.updateChecklistItem(selectedSubject, id, { notes: notesText })
    setNotesEditId(null)
    setNotesText('')
  }

  return (
    <div className="stats">
      <h2 style={{ marginTop: 0 }}>✓ 短答過去問パーフェクト　チェックリスト</h2>
      <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
        短答過去問の学習進度を記録・管理します。科目ごとにCSVデータを貼り付けてください。
      </p>

      {/* 科目タブ */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHECKLIST_SUBJECTS.map((subject) => {
            // このタブの科目データから最高正答率を取得
            const subjectChecklist = checklists[subject.key] || []
            const maxRate = subjectChecklist.length > 0 ? Math.max(...subjectChecklist.map((i) => i.correctRate)) : 0
            const bgColor = selectedSubject === subject.key ? getCorrectRateBgColor(maxRate) : 'transparent'

            return (
              <button
                key={subject.key}
                className={`btn${selectedSubject === subject.key ? '' : ' btn--ghost'}`}
                onClick={() => setSelectedSubject(subject.key)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  background: selectedSubject === subject.key ? bgColor : 'transparent',
                }}
              >
                {subject.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 4 }}>達成率</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--accent)' }}>
              {completionRate}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {checkedCount} / {totalCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 4 }}>正答率</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--accent)' }}>
              {successRate}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {successAttempts.length} / {allAttempts.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 4 }}>完全正答率</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>
              {perfectRate}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {perfectAttempts.length} / {allAttempts.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn${filter === 'all' ? '' : ' btn--ghost'}`}
              onClick={() => setFilter('all')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              すべて
            </button>
            <button
              className={`btn${filter === 'checked' ? '' : ' btn--ghost'}`}
              onClick={() => setFilter('checked')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              ✓ 完了
            </button>
            <button
              className={`btn${filter === 'unchecked' ? '' : ' btn--ghost'}`}
              onClick={() => setFilter('unchecked')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              ○ 未完了
            </button>
            <button
              className="btn btn--primary"
              onClick={() => setCsvInputOpen(!csvInputOpen)}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {csvInputOpen ? '✕ キャンセル' : '📋 CSVを貼り付け'}
            </button>
          </div>
        </div>

        {/* CSV入力エリア */}
        {csvInputOpen && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-soft)' }}>
              <strong>CSVフォーマット（カンマ区切り）:</strong>
              <div style={{ fontFamily: 'monospace', marginTop: 4, background: '#fff', padding: 8, borderRadius: 4 }}>
                問題番号,テーマ,正答率<br />
                H20-1,信義則と権利濫用,95<br />
                H30-1,胎児,83<br />
                ...
              </div>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="上記フォーマットでCSVデータを貼り付けてください"
              style={{
                width: '100%',
                minHeight: 120,
                padding: 8,
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 12,
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--primary" onClick={handlePasteCSV}>
                ✓ データを読み込む
              </button>
              <button className="btn btn--ghost" onClick={() => setCsvInputOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* テーブル */}
      {totalCount > 0 ? (
        <div className="panel">
          <h3>問題一覧</h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 8, textAlign: 'center', width: 30 }}>▶</th>
                  <th style={{ padding: 8, textAlign: 'left', width: 100 }}>問題番号</th>
                  <th style={{ padding: 8, textAlign: 'left', width: 150 }}>テーマ</th>
                  <th style={{ padding: 8, textAlign: 'center', width: 60 }}>正答率</th>
                  <th style={{ padding: 8, textAlign: 'left', width: 100 }}>引継ぎ</th>
                  <th style={{ padding: 8, textAlign: 'left', minWidth: 120 }}>チェックリスト</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: item.checked
                        ? 'rgba(16, 185, 129, 0.05)'
                        : getCorrectRateBgColor(item.correctRate),
                    }}
                  >
                    <td style={{ padding: 8, textAlign: 'center', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text-soft)', fontWeight: 600 }}>
                          {(subjectStartNumbers[selectedSubject] || 1) + index}
                        </span>
                        <button
                          onClick={() => {
                            console.log('クリック:', item.id, item.isNextStart)
                            setNextStart(item.id)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: item.isNextStart ? '#ef4444' : 'var(--text-soft)',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: '0',
                            minWidth: '16px',
                            minHeight: '16px',
                          }}
                          title="次回の開始位置"
                        >
                          {item.isNextStart ? '▶' : '  '}
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 8,
                        textAlign: 'left',
                        fontWeight: 600,
                        color: item.checked ? 'var(--text-soft)' : 'var(--text)',
                        textDecoration: item.checked ? 'line-through' : 'none',
                      }}
                    >
                      {item.questionNumber}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        textAlign: 'left',
                        color: item.checked ? 'var(--text-soft)' : 'var(--text)',
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.theme}
                    >
                      {item.theme}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        textAlign: 'center',
                        color: getCorrectRateColor(item.correctRate),
                        fontWeight: 600,
                      }}
                    >
                      {item.correctRate}%
                    </td>
                    <td style={{ padding: 8, textAlign: 'left' }}>
                      {notesEditId === item.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          onBlur={() => saveNotes(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveNotes(item.id)
                            if (e.key === 'Escape') setNotesEditId(null)
                          }}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            fontSize: 12,
                            border: '1px solid var(--accent)',
                            borderRadius: 4,
                          }}
                          placeholder="引継ぎ情報..."
                        />
                      ) : (
                        <button
                          onClick={() => openNotesEdit(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: item.notes ? 'var(--accent)' : 'var(--text-soft)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                          title={item.notes || '引継ぎ情報を追加'}
                        >
                          {item.notes ? item.notes : '+ 追加'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: 8, textAlign: 'left' }}>
                      {expandedAttempts === item.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {getAttempts(item.memo).map((status, idx) => (
                              <button
                                key={idx}
                                onClick={() => removeAttempt(item.id, idx)}
                                style={{
                                  background: status === '○' ? '#059669' : status === '△' ? '#d97706' : '#dc2626',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                }}
                                title="クリックで削除"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button
                              onClick={() => addAttempt(item.id, '○')}
                              style={{
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: 3,
                                padding: '2px 4px',
                                fontSize: 11,
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              ○
                            </button>
                            <button
                              onClick={() => addAttempt(item.id, '△')}
                              style={{
                                background: '#d97706',
                                color: 'white',
                                border: 'none',
                                borderRadius: 3,
                                padding: '2px 4px',
                                fontSize: 11,
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              △
                            </button>
                            <button
                              onClick={() => addAttempt(item.id, '✖')}
                              style={{
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: 3,
                                padding: '2px 4px',
                                fontSize: 11,
                                cursor: 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              ✖
                            </button>
                          </div>
                          <button
                            onClick={() => setExpandedAttempts(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-soft)',
                              cursor: 'pointer',
                              fontSize: 11,
                              padding: 0,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedAttempts(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            padding: 0,
                          }}
                        >
                          {getAttempts(item.memo).length > 0 ? (
                            <>
                              {getAttempts(item.memo).map((status, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    color:
                                      status === '○'
                                        ? '#059669'
                                        : status === '△'
                                          ? '#d97706'
                                          : '#dc2626',
                                    fontWeight: 'bold',
                                    marginRight: 2,
                                  }}
                                >
                                  {status}
                                </span>
                              ))}
                              <span style={{ color: 'var(--text-soft)' }}>
                                ({getAttempts(item.memo).length}回)
                              </span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-soft)' }}>+ 試行結果を追加</span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-soft)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p>このセクションにはデータがありません。</p>
          <p style={{ fontSize: 12 }}>上記の「📋 CSVを貼り付け」ボタンからCSVデータを読み込んでください。</p>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: 'var(--panel)', borderRadius: 8, fontSize: 12, color: 'var(--text-soft)' }}>
        <strong>💡 使い方：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>「📋 CSVを貼り付け」ボタンで、CSVデータを読み込み</li>
          <li><strong>▶ マーク</strong>：クリックで「次回の開始位置」を指定（赤色で表示）</li>
          <li><strong>引継ぎ欄</strong>：前回の学習で注意すべき点などを記入（マウスオンで確認可能）</li>
          <li>「試行結果を追加」をクリックして、<span style={{ color: '#10b981', fontWeight: 'bold' }}>○</span>（できた） / <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>△</span>（怪しい） / <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✖</span>（できない）を記録</li>
          <li>複数回の試行を記録可能（例：1回目○、2回目△）</li>
          <li>フィルターを使って、未完了の問題に絞り込み</li>
          <li>正答率の色：<span style={{ color: '#ec4899' }}>■ 80%以上（ピンク）</span> / <span style={{ color: '#f59e0b' }}>■ 60-79%（オレンジ）</span> / <span style={{ color: '#888' }}>■ 60%未満（グレー）</span></li>
        </ul>
      </div>
    </div>
  )
}
