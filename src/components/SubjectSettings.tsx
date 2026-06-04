import { useState } from 'react'
import type { Subject, Task, TaskType, ChecklistSubject, Exam } from '../types'
import { CHECKLIST_SUBJECTS } from '../types'
import type { Store } from '../useStore'
import { EXAM_COLORS } from '../utils'

interface SubjectSettingsProps {
  subjects: Subject[]
  taskTypeMeta: { key: TaskType; label: string; icon: string }[]
  tasks: Task[]
  exams: Exam[]
  store: Store
}

export function SubjectSettings({ subjects, taskTypeMeta, tasks, store }: SubjectSettingsProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(EXAM_COLORS[0])
  const [expandedSections, setExpandedSections] = useState({
    addSubject: true,
    subjectList: true,
    checklistColors: false,
    taskTypes: false,
    status: false,
    badgeImage: false,
    theme: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const countFor = (id: string) => tasks.filter((t) => t.subjectId === id).length

  const add = () => {
    const n = newName.trim()
    if (!n) return
    store.addSubject(n, newColor)
    setNewName('')
  }

  return (
    <div className="stats">
      <h2 style={{ marginTop: 0 }}>⚙ 各種設定</h2>
      <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
        アプリケーションの各種設定を行います。
      </p>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('status')}
        >
          {expandedSections.status ? '▼' : '▶'} 学習ボード項目
        </h3>
        {expandedSections.status && (
          <div className="subject-list">
            {store.state.statusMeta.map((status, index) => (
              <StatusRow key={status.key} status={status} index={index} store={store} />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('badgeImage')}
        >
          {expandedSections.badgeImage ? '▼' : '▶'} 試験バッジイラスト
        </h3>
        {expandedSections.badgeImage && (
          <div className="subject-list">
            {store.state.exams.map((exam) => (
              <ExamBadgeUploader key={exam.id} exam={exam} store={store} />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('theme')}
        >
          {expandedSections.theme ? '▼' : '▶'} テーマ設定
        </h3>
        {expandedSections.theme && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className={`btn${store.state.theme === 'light' ? '' : ' btn--ghost'}`}
              onClick={() => store.updateTheme('light')}
              style={{ padding: '8px 16px' }}
            >
              ☀️ ライトモード
            </button>
            <button
              className={`btn${store.state.theme === 'dark' ? '' : ' btn--ghost'}`}
              onClick={() => store.updateTheme('dark')}
              style={{ padding: '8px 16px' }}
            >
              🌙 ダークモード
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('addSubject')}
        >
          {expandedSections.addSubject ? '▼' : '▶'} 科目を追加
        </h3>
        {expandedSections.addSubject && (
          <div className="subject-add">
            <input
            value={newName}
            placeholder="科目名（例：労働法 / 倒産法）"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <div className="color-row">
              {EXAM_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch${newColor === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <button className="btn btn--primary" onClick={add}>
              ＋ 追加
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('subjectList')}
        >
          {expandedSections.subjectList ? '▼' : '▶'} 科目一覧（{subjects.length}件）
        </h3>
        {expandedSections.subjectList && (
          <>
            {subjects.length === 0 ? (
              <p style={{ color: 'var(--text-soft)', margin: 0 }}>科目がありません。</p>
            ) : (
              <div className="subject-list">
                {subjects.map((s) => (
                  <SubjectRow key={s.id} subject={s} count={countFor(s.id)} store={store} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('checklistColors')}
        >
          {expandedSections.checklistColors ? '▼' : '▶'} チェックリスト色分け設定
        </h3>
        {expandedSections.checklistColors && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              科目ごとに色分けのしきい値を設定できます。
            </p>
            <div style={{ display: 'grid', gap: 16 }}>
              {CHECKLIST_SUBJECTS.map((subject) => (
                <ChecklistColorRow
                  key={subject.key}
                  subject={subject}
                  store={store}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('taskTypes')}
        >
          {expandedSections.taskTypes ? '▼' : '▶'} タスク種類（{taskTypeMeta.length}件）
        </h3>
        {expandedSections.taskTypes && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              各タスク種類の名前とアイコンを編集できます。
            </p>
            <div className="subject-list">
              {taskTypeMeta.map((type, index) => (
                <TaskTypeRow key={type.key} type={type} index={index} store={store} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SubjectRow({
  subject,
  count,
  store,
}: {
  subject: Subject
  count: number
  store: Store
}) {
  const [name, setName] = useState(subject.name)
  const [editingColor, setEditingColor] = useState(false)

  const commitName = () => {
    const n = name.trim()
    if (n && n !== subject.name) store.updateSubject(subject.id, { name: n })
    else setName(subject.name)
  }

  return (
    <div className="subject-row">
      <button
        className="subject-row__color"
        style={{ background: subject.color }}
        onClick={() => setEditingColor((v) => !v)}
        title="クリックでカラー変更"
      />
      <input
        className="subject-row__name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span className="subject-row__count">{count} タスク</span>
      <button
        className="btn btn--danger"
        style={{ padding: '6px 10px', fontSize: 13 }}
        onClick={() => {
          if (
            confirm(
              `科目「${subject.name}」を削除しますか？\n（${count}件のタスクは「未設定」に戻ります。タスク自体は消えません）`,
            )
          ) {
            store.deleteSubject(subject.id)
          }
        }}
      >
        削除
      </button>

      {editingColor && (
        <div className="subject-row__palette">
          {EXAM_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch${subject.color === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                store.updateSubject(subject.id, { color: c })
                setEditingColor(false)
              }}
              aria-label={c}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskTypeRow({
  type,
  index,
  store,
}: {
  type: { key: TaskType; label: string; icon: string }
  index: number
  store: Store
}) {
  const [label, setLabel] = useState(type.label)
  const [icon, setIcon] = useState(type.icon)

  const commitLabel = () => {
    const l = label.trim()
    if (l && l !== type.label) store.updateTaskTypeMeta(index, { label: l })
    else setLabel(type.label)
  }

  const commitIcon = () => {
    if (icon && icon !== type.icon) store.updateTaskTypeMeta(index, { icon })
  }

  return (
    <div className="subject-row">
      <span style={{ fontSize: 20, minWidth: 40 }}>{icon}</span>
      <input
        className="subject-row__name"
        value={label}
        placeholder="種類名"
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <input
        placeholder="アイコン"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        onBlur={commitIcon}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        style={{ width: 60, fontSize: 14, textAlign: 'center' }}
      />
    </div>
  )
}

function ChecklistColorRow({
  subject,
  store,
}: {
  subject: { key: ChecklistSubject; label: string }
  store: Store
}) {
  const settings = store.state.checklistColorThresholds[subject.key]
  const [excellentThreshold, setExcellentThreshold] = useState(settings.excellentThreshold.toString())
  const [goodThreshold, setGoodThreshold] = useState(settings.goodThreshold.toString())

  const commitExcellent = () => {
    const val = parseInt(excellentThreshold, 10)
    if (!isNaN(val) && val !== settings.excellentThreshold) {
      store.updateChecklistColorThresholds(subject.key, { excellentThreshold: val })
    } else {
      setExcellentThreshold(settings.excellentThreshold.toString())
    }
  }

  const commitGood = () => {
    const val = parseInt(goodThreshold, 10)
    if (!isNaN(val) && val !== settings.goodThreshold) {
      store.updateChecklistColorThresholds(subject.key, { goodThreshold: val })
    } else {
      setGoodThreshold(settings.goodThreshold.toString())
    }
  }

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ minWidth: 80, fontWeight: 600 }}>{subject.label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>優秀</label>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: settings.excellentColor,
          }}
        />
        <input
          type="number"
          value={excellentThreshold}
          onChange={(e) => setExcellentThreshold(e.target.value)}
          onBlur={commitExcellent}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          style={{ width: 50, padding: '4px', fontSize: 12 }}
          min="0"
          max="100"
        />
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>%以上</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>良好</label>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: settings.goodColor,
          }}
        />
        <input
          type="number"
          value={goodThreshold}
          onChange={(e) => setGoodThreshold(e.target.value)}
          onBlur={commitGood}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          style={{ width: 50, padding: '4px', fontSize: 12 }}
          min="0"
          max="100"
        />
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>%以上</span>
      </div>
    </div>
  )
}

function StatusRow({
  status,
  index,
  store,
}: {
  status: { key: string; label: string; hint: string }
  index: number
  store: Store
}) {
  const [label, setLabel] = useState(status.label)
  const [hint, setHint] = useState(status.hint)

  const commitLabel = () => {
    const l = label.trim()
    if (l && l !== status.label) store.updateStatusMeta(index, { label: l })
    else setLabel(status.label)
  }

  const commitHint = () => {
    if (hint && hint !== status.hint) store.updateStatusMeta(index, { hint })
  }

  return (
    <div className="subject-row">
      <span style={{ fontWeight: 600, minWidth: 80 }}>【{status.key}】</span>
      <input
        className="subject-row__name"
        value={label}
        placeholder="項目名"
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <input
        placeholder="説明文"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        onBlur={commitHint}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        style={{ fontSize: 12, color: 'var(--text-soft)', flex: 1 }}
      />
    </div>
  )
}

function ExamBadgeUploader({ exam, store }: { exam: Exam; store: Store }) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target?.result as string

      // Canvas で円型に切り抜き
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 200
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 円型のクリップパス
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.clip()

        // 画像を中央に配置して描画
        const imgSize = Math.max(img.width, img.height)
        const scale = size / imgSize
        const x = (size - img.width * scale) / 2
        const y = (size - img.height * scale) / 2
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

        // base64 データURLを取得
        const croppedImage = canvas.toDataURL('image/png')
        store.updateExam(exam.id, { badgeImage: croppedImage })
      }
      img.src = imageData
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="subject-row" style={{ alignItems: 'center', gap: 12 }}>
      <span style={{ fontWeight: 600, minWidth: 120 }}>{exam.name}</span>
      {exam.badgeImage && (
        <img
          src={exam.badgeImage}
          alt={exam.name}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        />
      )}
      <label
        style={{
          padding: '6px 12px',
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-block',
        }}
      >
        画像選択
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </label>
      {exam.badgeImage && (
        <button
          onClick={() => store.updateExam(exam.id, { badgeImage: undefined })}
          style={{
            padding: '6px 12px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
          }}
        >
          削除
        </button>
      )}
    </div>
  )
}
