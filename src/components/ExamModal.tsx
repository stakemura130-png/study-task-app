import { useState } from 'react'
import type { Exam } from '../types'
import type { Store } from '../useStore'
import { EXAM_COLORS } from '../utils'

interface ExamModalProps {
  store: Store
  /** 編集対象。null なら新規作成 */
  exam: Exam | null
  onClose: () => void
}

export function ExamModal({ store, exam, onClose }: ExamModalProps) {
  const [name, setName] = useState(exam?.name ?? '')
  const [examDate, setExamDate] = useState(exam?.examDate ?? '')
  const [color, setColor] = useState(exam?.color ?? EXAM_COLORS[0])
  const [showColorPicker, setShowColorPicker] = useState(false)

  const isEdit = exam !== null

  const save = () => {
    const n = name.trim()
    if (!n) return
    if (isEdit && exam) {
      store.updateExam(exam.id, { name: n, examDate, color })
    } else {
      store.addExam(n, examDate, color)
    }
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal__head">
          <h2>{isEdit ? '試験日を編集' : '試験日を追加'}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="field">
            <label>試験名</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  border: '2px solid #ccc',
                  background: color,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="クリックして色を変更"
              />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例）司法試験 / 行政書士試験 / 予備試験"
                onKeyDown={(e) => e.key === 'Enter' && save()}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {showColorPicker && (
            <div className="field">
              <label>色を選択</label>
              <div className="color-row">
                {EXAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${color === c ? ' active' : ''}`}
                    style={{ background: c }}
                    onClick={() => {
                      setColor(c)
                      setShowColorPicker(false)
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>試験日（カウントダウンに使用）</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>

          <div className="field">
            <label>カラー</label>
            <div className="color-row">
              {EXAM_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch${color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="modal__foot">
          {isEdit && exam ? (
            <button
              className="btn btn--danger"
              onClick={() => {
                if (
                  confirm(
                    `「${exam.name}」の試験日を削除しますか？\n（学習タスクは共通のため削除されません）`,
                  )
                ) {
                  store.deleteExam(exam.id)
                  onClose()
                }
              }}
            >
              試験日を削除
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn--primary" onClick={save}>
            {isEdit ? '保存' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
