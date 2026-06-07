import { useMemo, useState } from 'react'
import type { Status, Subject, Task, TaskType } from '../types'
import { STATUS_META, STATUS_COLOR } from '../types'
import type { Store } from '../useStore'
import { formatMinutes, stripSubjectFromTitle } from '../utils'

interface BoardProps {
  tasks: Task[]
  subjects: Subject[]
  taskTypeMeta: { key: TaskType; label: string; icon: string }[]
  store: Store
  onOpenTask: (task: Task) => void
}

export function Board({ tasks, subjects, taskTypeMeta, store, onOpenTask }: BoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Status | null>(null)

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  )

  return (
    <div className="board">
      {STATUS_META.map((meta) => {
        const cards = tasks
          .filter((t) => t.status === meta.key)
          .sort((a, b) => a.order - b.order)
        return (
          <Column
            key={meta.key}
            status={meta.key}
            label={meta.label}
            hint={meta.hint}
            count={cards.length}
            isOver={overCol === meta.key}
            onDragEnter={() => setOverCol(meta.key)}
            onDragLeave={() => setOverCol((c) => (c === meta.key ? null : c))}
            onDrop={(targetId) => {
              if (dragId) store.moveTask(dragId, meta.key, targetId)
              setDragId(null)
              setOverCol(null)
            }}
            onAdd={(title) => store.addTask(title, meta.key)}
          >
            {cards.map((task) => (
              <Card
                key={task.id}
                task={task}
                subject={task.subjectId ? subjectMap.get(task.subjectId) ?? null : null}
                taskTypeMeta={taskTypeMeta}
                dragging={dragId === task.id}
                onDragStart={() => setDragId(task.id)}
                onDragEnd={() => {
                  setDragId(null)
                  setOverCol(null)
                }}
                onClick={() => onOpenTask(task)}
              />
            ))}
          </Column>
        )
      })}
    </div>
  )
}

interface ColumnProps {
  status: Status
  label: string
  hint: string
  count: number
  isOver: boolean
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (targetId?: string) => void
  onAdd: (title: string) => void
  children: React.ReactNode
}

function Column({
  status,
  label,
  hint,
  count,
  isOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onAdd,
  children,
}: ColumnProps) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const submit = () => {
    const v = text.trim()
    if (v) onAdd(v)
    setText('')
    setAdding(false)
  }

  return (
    <div
      className={`column${isOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        onDragEnter()
      }}
      onDragLeave={(e) => {
        // 子要素へ移っただけの dragleave は無視
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeave()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const targetId = (e.target as HTMLElement)
          .closest('[data-card-id]')
          ?.getAttribute('data-card-id')
        onDrop(targetId ?? undefined)
      }}
    >
      <div className="column__head">
        <span className="column__dot" style={{ background: STATUS_COLOR[status] }} />
        <span className="column__title">{label}</span>
        <span className="column__count">{count}</span>
      </div>
      <div className="column__hint">{hint}</div>
      <div className="column__list">{children}</div>

      {adding ? (
        <div className="inline-add">
          <textarea
            autoFocus
            rows={2}
            value={text}
            placeholder="科目・論点・タスクを入力…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
              if (e.key === 'Escape') {
                setText('')
                setAdding(false)
              }
            }}
          />
          <div className="inline-add__actions">
            <button className="btn btn--primary" onClick={submit}>
              追加
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setText('')
                setAdding(false)
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button className="column__add" onClick={() => setAdding(true)}>
          ＋ カードを追加
        </button>
      )}
    </div>
  )
}

interface CardProps {
  task: Task
  subject: Subject | null
  taskTypeMeta: { key: TaskType; label: string; icon: string }[]
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}

function Card({ task, subject, taskTypeMeta, dragging, onDragStart, onDragEnd, onClick }: CardProps) {
  // 科目が割り当てられている場合、タイトルから科目名を除去
  const displayTitle = subject ? stripSubjectFromTitle(task.title, subject.name) : task.title
  const typeMeta = task.type ? taskTypeMeta.find((t) => t.key === task.type) : null

  return (
    <div
      className={`card${dragging ? ' dragging' : ''}`}
      data-card-id={task.id}
      draggable
      style={subject ? { borderLeft: `4px solid ${subject.color}` } : undefined}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="card__title">{displayTitle}</div>
      {(subject || typeMeta || task.studyMinutes > 0 || task.note.trim()) && (
        <div className="card__meta">
          {subject && (
            <span className="subject-tag" style={{ background: subject.color }}>
              {subject.name}
            </span>
          )}
          {typeMeta && (
            <span className="type-tag">
              {typeMeta.icon} {typeMeta.label}
            </span>
          )}
          {task.studyMinutes > 0 && <span>⏱ {formatMinutes(task.studyMinutes)}</span>}
          {task.note.trim() && <span className="card__note-mark">≣ メモ</span>}
        </div>
      )}
    </div>
  )
}
