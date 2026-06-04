import { useEffect, useState } from 'react'
import type { Status, Subject, Task, TaskType } from '../types'
import { STATUS_META } from '../types'
import type { Store } from '../useStore'
import { formatMinutes } from '../utils'

interface TaskModalProps {
  task: Task
  subjects: Subject[]
  taskTypeMeta: { key: TaskType; label: string; icon: string }[]
  store: Store
  onClose: () => void
}

const QUICK_MINUTES = [15, 30, 45, 60, 90]

export function TaskModal({ task, subjects, taskTypeMeta, store, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [status, setStatus] = useState<Status>(task.status)
  const [subjectId, setSubjectId] = useState<string | null>(task.subjectId)
  const [type, setType] = useState<TaskType | null>(task.type)
  const [customMin, setCustomMin] = useState('')

  // 親の state が更新されたら最新の累計を反映
  const liveMinutes = task.studyMinutes

  const save = () => {
    const t = title.trim() || '無題のタスク'
    if (status !== task.status) {
      store.moveTask(task.id, status)
    }
    store.updateTask(task.id, { title: t, note, subjectId, type })
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, note, status, subjectId, type])

  const addStudy = (min: number) => {
    if (min > 0) store.logStudy(task.id, min)
  }

  return (
    <div className="overlay" onClick={save}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>タスクの詳細</h2>
          <button className="icon-btn" onClick={save}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="field">
            <label>タイトル</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="科目・論点名"
            />
          </div>

          <div className="field">
            <label>ステータス</label>
            <div className="status-pills">
              {STATUS_META.map((m) => (
                <button
                  key={m.key}
                  className={`status-pill${status === m.key ? ' active' : ''}`}
                  onClick={() => setStatus(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>科目（カードの色分け）</label>
            <div className="status-pills">
              <button
                className={`status-pill${subjectId === null ? ' active' : ''}`}
                onClick={() => setSubjectId(null)}
              >
                未設定
              </button>
              {subjects.map((s) => {
                const active = subjectId === s.id
                return (
                  <button
                    key={s.id}
                    className="status-pill"
                    onClick={() => setSubjectId(s.id)}
                    style={
                      active
                        ? { background: s.color, color: '#fff', borderColor: s.color }
                        : { borderColor: s.color, color: s.color }
                    }
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field">
            <label>種類（テキスト・過去問など）</label>
            <div className="status-pills">
              <button
                className={`status-pill${type === null ? ' active' : ''}`}
                onClick={() => setType(null)}
              >
                未設定
              </button>
              {taskTypeMeta.map((m) => (
                <button
                  key={m.key}
                  className={`status-pill${type === m.key ? ' active' : ''}`}
                  onClick={() => setType(m.key)}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>メモ（条文・判例・要点など自由に）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例）民法177条 — 物権変動の対抗要件。第三者の範囲が論点…"
            />
          </div>

          <div className="field">
            <label>学習時間の記録（累計 {formatMinutes(liveMinutes)}）</label>
            <div className="study-row">
              {QUICK_MINUTES.map((m) => (
                <button key={m} className="study-chip" onClick={() => addStudy(m)}>
                  ＋{m}分
                </button>
              ))}
              <input
                style={{
                  width: 90,
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 13,
                }}
                type="number"
                min={0}
                placeholder="分を入力"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
              />
              <button
                className="study-chip"
                onClick={() => {
                  const m = parseInt(customMin, 10)
                  if (!Number.isNaN(m)) addStudy(m)
                  setCustomMin('')
                }}
              >
                記録
              </button>
            </div>
          </div>
        </div>

        <div className="modal__foot">
          <button
            className="btn btn--danger"
            onClick={() => {
              if (confirm('このタスクを削除しますか？')) {
                store.deleteTask(task.id)
                onClose()
              }
            }}
          >
            削除
          </button>
          <button className="btn btn--primary" onClick={save}>
            保存して閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
