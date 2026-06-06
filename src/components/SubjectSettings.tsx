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

export function SubjectSettings({ subjects, taskTypeMeta, tasks, exams, store }: SubjectSettingsProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(EXAM_COLORS[0])
  const [newExamDate, setNewExamDate] = useState('')
  const [userId, setUserId] = useState(() => localStorage.getItem('app:userId') || '')
  const [expandedSections, setExpandedSections] = useState({
    addSubject: true,
    subjectList: true,
    checklistColors: false,
    taskTypes: false,
    status: false,
    badgeImage: false,
    theme: false,
    userId: false,
    menu: false,
    marquee: false,
    exams: false,
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
          onClick={() => toggleSection('userId')}
        >
          {expandedSections.userId ? '▼' : '▶'} ユーザーID（複数デバイス同期用）
        </h3>
        {expandedSections.userId && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              複数デバイス間でデータを同期するために使用されます。全デバイスで同じIDを設定してください。
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="ユーザーID"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
              <button
                className="btn btn--primary"
                onClick={() => {
                  const newId = userId.trim()
                  if (newId) {
                    localStorage.setItem('app:userId', newId)
                    alert('ユーザーIDを保存しました。ページをリロードしてください。')
                  } else {
                    alert('ユーザーIDを入力してください。')
                  }
                }}
                style={{ padding: '8px 16px' }}
              >
                保存
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  const currentId = localStorage.getItem('app:userId') || ''
                  setUserId(currentId)
                }}
                style={{ padding: '8px 16px' }}
              >
                リセット
              </button>
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

      <div className="panel">
        <h3
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={() => toggleSection('menu')}
        >
          {expandedSections.menu ? '▼' : '▶'} メニュー設定
        </h3>
        {expandedSections.menu && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              サイドバーのメニュー順序・名称・表示/非表示を変更できます。
            </p>
            <div className="subject-list">
              {[...store.state.menuConfig]
                .sort((a, b) => a.order - b.order)
                .map((menu, index) => (
                  <MenuRow key={menu.key} menu={menu} index={index} store={store} allMenus={store.state.menuConfig} />
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
          onClick={() => toggleSection('exams')}
        >
          {expandedSections.exams ? '▼' : '▶'} 試験日管理
        </h3>
        {expandedSections.exams && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              各試験の日付と情報を管理します。
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              {exams.map((exam) => (
                <ExamRow key={exam.id} exam={exam} store={store} />
              ))}
            </div>
            <button
              className="btn btn--primary"
              onClick={() => store.addExam('新しい試験', '', EXAM_COLORS[0])}
              style={{ marginTop: 12, width: '100%' }}
            >
              ＋ 試験を追加
            </button>
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
          onClick={() => toggleSection('marquee')}
        >
          {expandedSections.marquee ? '▼' : '▶'} マルキー設定
        </h3>
        {expandedSections.marquee && (
          <>
            <p style={{ color: 'var(--text-soft)', marginTop: -8 }}>
              タイトルとカウントダウンの間に流れるテキストと枠のスタイルを設定できます。
            </p>
            <MarqueeSettings store={store} />
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

function MenuRow({
  menu,
  index,
  store,
  allMenus,
}: {
  menu: { key: string; label: string; visible: boolean; order: number }
  index: number
  store: Store
  allMenus: { key: string; label: string; visible: boolean; order: number }[]
}) {
  const [label, setLabel] = useState(menu.label)

  const commitLabel = () => {
    const l = label.trim()
    if (l && l !== menu.label) {
      const newMenus = allMenus.map((m) => (m.key === menu.key ? { ...m, label: l } : m))
      store.updateMenuConfig(newMenus)
    } else {
      setLabel(menu.label)
    }
  }

  const toggleVisible = () => {
    const newMenus = allMenus.map((m) => (m.key === menu.key ? { ...m, visible: !m.visible } : m))
    store.updateMenuConfig(newMenus)
  }

  const moveUp = () => {
    if (index === 0) return
    const newMenus = [...allMenus].sort((a, b) => a.order - b.order)
    ;[newMenus[index - 1].order, newMenus[index].order] = [newMenus[index].order, newMenus[index - 1].order]
    store.updateMenuConfig(newMenus)
  }

  const moveDown = () => {
    if (index === allMenus.filter((m) => m.visible).length - 1) return
    const newMenus = [...allMenus].sort((a, b) => a.order - b.order)
    ;[newMenus[index].order, newMenus[index + 1].order] = [newMenus[index + 1].order, newMenus[index].order]
    store.updateMenuConfig(newMenus)
  }

  return (
    <div
      className="subject-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: menu.visible ? 'var(--surface)' : 'var(--panel)',
        borderRadius: 6,
        border: '1px solid var(--border)',
        opacity: menu.visible ? 1 : 0.6,
      }}
    >
      <input
        type="checkbox"
        checked={menu.visible}
        onChange={toggleVisible}
        style={{ width: 18, height: 18, cursor: 'pointer' }}
        title="表示/非表示"
      />
      <input
        className="subject-row__name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="メニュー名"
        disabled={!menu.visible}
        style={{ opacity: menu.visible ? 1 : 0.5 }}
      />
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        <button
          onClick={moveUp}
          disabled={index === 0}
          style={{
            padding: '4px 8px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: index === 0 ? 'default' : 'pointer',
            fontSize: 12,
            opacity: index === 0 ? 0.5 : 1,
          }}
          title="上に移動"
        >
          ↑
        </button>
        <button
          onClick={moveDown}
          disabled={index === allMenus.filter((m) => m.visible).length - 1}
          style={{
            padding: '4px 8px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: index === allMenus.filter((m) => m.visible).length - 1 ? 'default' : 'pointer',
            fontSize: 12,
            opacity: index === allMenus.filter((m) => m.visible).length - 1 ? 0.5 : 1,
          }}
          title="下に移動"
        >
          ↓
        </button>
      </div>
    </div>
  )
}

function MarqueeSettings({ store }: { store: Store }) {
  const config = store.state.marqueeConfig
  const [speed, setSpeed] = useState(config.speed.toString())
  const [switchInterval, setSwitchInterval] = useState(config.switchIntervalMinutes.toString())

  const commitSpeed = () => {
    const s = parseInt(speed, 10)
    if (!isNaN(s) && s > 0) {
      store.updateMarqueeConfig({ speed: s })
    } else {
      setSpeed(config.speed.toString())
    }
  }

  const commitSwitchInterval = () => {
    const i = parseInt(switchInterval, 10)
    if (!isNaN(i) && i > 0) {
      store.updateMarqueeConfig({ switchIntervalMinutes: i })
    } else {
      setSwitchInterval(config.switchIntervalMinutes.toString())
    }
  }

  const updatePattern = (patternIndex: number, patch: Partial<any>) => {
    const newPatterns = config.patterns.map((p, i) => (i === patternIndex ? { ...p, ...patch } : p))
    store.updateMarqueeConfig({ patterns: newPatterns })
  }

  const addPattern = () => {
    const newPattern = {
      id: 'pat_' + Math.random().toString(36).substr(2, 9),
      messages: '新しいパターン',
      bgColor: '#1e293b',
      textColor: '#e2e8f0',
      borderColor: '#6366f1',
      borderStyle: 'solid' as const,
    }
    store.updateMarqueeConfig({ patterns: [...config.patterns, newPattern] })
  }

  const deletePattern = (patternIndex: number) => {
    if (config.patterns.length <= 1) {
      alert('最低1つのパターンが必要です')
      return
    }
    const newPatterns = config.patterns.filter((_, i) => i !== patternIndex)
    store.updateMarqueeConfig({ patterns: newPatterns })
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 共通設定 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'var(--panel)', borderRadius: 6 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>アニメーション速度（秒）</label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            onBlur={commitSpeed}
            min="1"
            max="60"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>切り替え間隔（分）</label>
          <input
            type="number"
            value={switchInterval}
            onChange={(e) => setSwitchInterval(e.target.value)}
            onBlur={commitSwitchInterval}
            min="1"
            max="120"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>

      {/* パターン一覧 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>パターン（{config.patterns.length}）</h4>
          <button className="btn btn--primary" onClick={addPattern} style={{ padding: '4px 12px', fontSize: 12 }}>
            ＋ 追加
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {config.patterns.map((pattern, index) => (
            <MarqueePatternRow key={pattern.id} pattern={pattern} index={index} onUpdate={updatePattern} onDelete={deletePattern} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MarqueePatternRow({
  pattern,
  index,
  onUpdate,
  onDelete,
}: {
  pattern: any
  index: number
  onUpdate: (index: number, patch: Partial<any>) => void
  onDelete: (index: number) => void
}) {
  const [messages, setMessages] = useState(pattern.messages)
  const [expanded, setExpanded] = useState(false)

  const commitMessages = () => {
    if (messages.trim()) {
      onUpdate(index, { messages })
    }
  }

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: expanded ? 12 : 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 14,
            padding: 0,
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span style={{ fontWeight: 600, fontSize: 13 }}>パターン {index + 1}</span>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: pattern.bgColor,
            border: `2px solid ${pattern.borderColor}`,
            marginLeft: 'auto',
          }}
        />
        <button
          onClick={() => onDelete(index)}
          style={{
            padding: '4px 8px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          削除
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gap: 12 }}>
          {/* テキスト */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12 }}>テキスト（カンマ区切り）</label>
            <textarea
              value={messages}
              onChange={(e) => setMessages(e.target.value)}
              onBlur={commitMessages}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'inherit',
                background: 'var(--surface)',
                color: 'var(--text)',
                minHeight: 60,
                resize: 'vertical',
              }}
            />
          </div>

          {/* 色設定 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ColorPicker
              label="背景色"
              value={pattern.bgColor}
              onChange={(color) => onUpdate(index, { bgColor: color })}
            />
            <ColorPicker
              label="テキスト色"
              value={pattern.textColor}
              onChange={(color) => onUpdate(index, { textColor: color })}
            />
            <ColorPicker
              label="枠線色"
              value={pattern.borderColor}
              onChange={(color) => onUpdate(index, { borderColor: color })}
            />
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>枠線スタイル</label>
              <select
                value={pattern.borderStyle}
                onChange={(e) => onUpdate(index, { borderStyle: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 12,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                <option value="solid">ソリッド</option>
                <option value="dashed">ダッシュ</option>
                <option value="gradient">グラデーション</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExamRow({ exam, store }: { exam: Exam; store: Store }) {
  const [name, setName] = useState(exam.name)
  const [examDate, setExamDate] = useState(exam.examDate)

  const commitName = () => {
    const n = name.trim()
    if (n && n !== exam.name) store.updateExam(exam.id, { name: n })
    else setName(exam.name)
  }

  const commitDate = () => {
    if (examDate && examDate !== exam.examDate) store.updateExam(exam.id, { examDate })
    else setExamDate(exam.examDate)
  }

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: exam.color,
          }}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
        <button
          className="btn btn--danger"
          onClick={() => store.deleteExam(exam.id)}
          style={{ padding: '4px 8px', fontSize: 12 }}
        >
          削除
        </button>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>試験日</label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          onBlur={commitDate}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
      </div>
    </div>
  )
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
      </div>
    </div>
  )
}
