import type { AppState, Exam, Subject, Task, Status, ChecklistSubject, ChecklistColorThresholds } from './types'
import { TASK_TYPE_META, CHECKLIST_SUBJECTS, DEFAULT_STATUS_META } from './types'
import { uid, todayStr } from './utils'
import { saveToFirebase } from './firebase'

const STORAGE_KEY = 'study-task-app:v3'
const LEGACY_KEYS = ['study-task-app:v2', 'study-task-app:v1']

// Default configuration constants
const DEFAULT_CHECKLIST_COLOR_THRESHOLDS: ChecklistColorThresholds = {
  excellentThreshold: 80,
  goodThreshold: 60,
  excellentColor: '#ec4899',
  goodColor: '#f59e0b',
  poorColor: '#000000',
}

const DEFAULT_MENU_CONFIG = [
  { key: 'board' as const, label: '学習ボード', visible: true, order: 0 },
  { key: 'stats' as const, label: '統計', visible: true, order: 1 },
  { key: 'settings' as const, label: '各種設定', visible: true, order: 2 },
  { key: 'checklist' as const, label: '学習チェックリスト', visible: true, order: 3 },
  { key: 'timer' as const, label: 'ポモドーロ', visible: true, order: 4 },
  { key: 'calendar' as const, label: 'カレンダー', visible: true, order: 5 },
]

const DEFAULT_POMODORO_CUSTOMIZATION = {
  learningColor: '#0ea5e9',
  breakColor: '#10b981',
  backgroundImage: null,
  backgroundOpacity: 100,
  enablePulseAnimation: true,
  soundVolume: 100,
}

const DEFAULT_MARQUEE_PATTERNS = [
  {
    id: undefined as any, // Will be replaced with uid() during initialization
    messages: '💪 頑張れ！,🎯 目標達成に向けて,✨ 絶対合格！,🔥 全力で応援！',
    bgColor: '#1e293b',
    textColor: '#e2e8f0',
    borderColor: '#6366f1',
    borderStyle: 'gradient' as const,
  },
  {
    id: undefined as any,
    messages: '📚 今が勝負,⚡ 走り抜けろ！,🏆 栄光を目指して,💡 知識は力',
    bgColor: '#172554',
    textColor: '#f1f5f9',
    borderColor: '#ec4899',
    borderStyle: 'solid' as const,
  },
  {
    id: undefined as any,
    messages: '🌟 君ならできる！,💯 完璧を目指して,🎊 一緒に頑張ろう,✊ 負けるな',
    bgColor: '#1f2937',
    textColor: '#fbbf24',
    borderColor: '#f59e0b',
    borderStyle: 'dashed' as const,
  },
  {
    id: undefined as any,
    messages: '🚀 突き進め！,🔥 熱くなれ！,💎 宝物を手に入れろ,🎯 目標必達',
    bgColor: '#1e3a1f',
    textColor: '#86efac',
    borderColor: '#10b981',
    borderStyle: 'gradient' as const,
  },
  {
    id: undefined as any,
    messages: '⭐ 星になれ！,🎸 楽しくやろう,😊 笑顔で乗り切れ,👊 応援してる',
    bgColor: '#312e81',
    textColor: '#c4b5fd',
    borderColor: '#a78bfa',
    borderStyle: 'solid' as const,
  },
]

// Helper function to create marquee patterns with fresh IDs
function createMarqueePatterns() {
  return DEFAULT_MARQUEE_PATTERNS.map((pattern) => ({
    ...pattern,
    id: uid(),
  }))
}

/** 既定の科目とカラー */
function seedSubjects(): Subject[] {
  return [
    { id: uid(), name: '憲法', color: '#ef4444' },
    { id: uid(), name: '民法', color: '#6366f1' },
    { id: uid(), name: '刑法', color: '#0ea5e9' },
    { id: uid(), name: '行政法', color: '#10b981' },
    { id: uid(), name: '商法・会社法', color: '#f59e0b' },
    { id: uid(), name: '民事訴訟法', color: '#8b5cf6' },
    { id: uid(), name: '刑事訴訟法', color: '#ec4899' },
    { id: uid(), name: '一般知識', color: '#14b8a6' },
  ]
}

/** タイトルから科目を推定（科目名で始まる／含むものを採用、長い名前を優先） */
export function inferSubjectId(title: string, subjects: Subject[]): string | null {
  const sorted = [...subjects].sort((a, b) => b.name.length - a.name.length)
  for (const s of sorted) {
    if (title.startsWith(s.name) || title.includes(s.name)) return s.id
  }
  return null
}

/** 最小限の空の初期状態を返す（Firebase ロード前に使用） */
export function createEmptyState(): AppState {
  return {
    tasks: [],
    exams: [],
    subjects: [],
    taskTypeMeta: TASK_TYPE_META,
    statusMeta: DEFAULT_STATUS_META,
    checklists: {
      minpou1: [],
      minpou2: [],
      keihoi: [],
      kenshou: [],
      gyousei: [],
      shougou: [],
      minjisoshou: [],
      keijisoshou: [],
      ippanchiski: [],
    },
    checklistColorThresholds: (() => {
      const thresholds: Record<ChecklistSubject, ChecklistColorThresholds> = {} as Record<
        ChecklistSubject,
        ChecklistColorThresholds
      >
      CHECKLIST_SUBJECTS.forEach((subject) => {
        thresholds[subject.key] = { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
      })
      return thresholds
    })(),
    theme: 'light',
    studyLog: [],
    menuConfig: DEFAULT_MENU_CONFIG,
    marqueeConfig: {
      patterns: createMarqueePatterns(),
      speed: 20,
      switchIntervalMinutes: 5,
    },
    pomodoroCustomization: DEFAULT_POMODORO_CUSTOMIZATION,
  }
}

/** 初回起動時のサンプルデータ：共通タスク＋複数の試験日＋科目 */
function seedState(): AppState {
  const year = new Date().getFullYear()

  const exams: Exam[] = [
    { id: uid(), name: '行政書士試験', examDate: `${year}-11-08`, color: '#10b981' },
    { id: uid(), name: '予備試験', examDate: `${year + 1}-05-16`, color: '#0ea5e9' },
    { id: uid(), name: '司法試験', examDate: `${year + 1}-07-10`, color: '#6366f1' },
  ]

  const subjects = seedSubjects()

  // 3試験で重なる科目を共通タスクとして用意
  const titles: { title: string; status: Status }[] = [
    { title: '憲法 — 人権', status: 'learning' },
    { title: '憲法 — 統治', status: 'todo' },
    { title: '民法 — 総則・物権', status: 'todo' },
    { title: '民法 — 債権', status: 'todo' },
    { title: '刑法 — 総論', status: 'todo' },
    { title: '刑法 — 各論', status: 'todo' },
    { title: '行政法 — 行政手続法', status: 'todo' },
    { title: '商法・会社法', status: 'todo' },
    { title: '民事訴訟法', status: 'todo' },
    { title: '刑事訴訟法', status: 'todo' },
    { title: '一般知識（行政書士）', status: 'todo' },
  ]

  const tasks: Task[] = titles.map((t, i) => ({
    id: uid(),
    title: t.title,
    note: '',
    status: t.status,
    subjectId: inferSubjectId(t.title, subjects),
    type: null,
    order: i,
    studyMinutes: 0,
    createdAt: todayStr(),
  }))

  // 科目別チェックリスト（各科目は空で初期化。ユーザーがCSVで入力）
  const checklists: Record<ChecklistSubject, any[]> = {
    minpou1: [
      { id: uid(), questionNumber: 'H20-1', theme: '信義則と権利濫用', correctRate: 95, checked: false, memo: '', notes: '', isNextStart: false },
      { id: uid(), questionNumber: 'H30-1', theme: '胎児', correctRate: 83, checked: false, memo: '', notes: '', isNextStart: false },
      { id: uid(), questionNumber: 'R5-1', theme: '胎児', correctRate: 65, checked: false, memo: '', notes: '', isNextStart: false },
    ],
    minpou2: [],
    keihoi: [],
    kenshou: [],
    gyousei: [],
    shougou: [],
    minjisoshou: [],
    keijisoshou: [],
    ippanchiski: [],
  }

  // チェックリスト色分け設定
  const checklistColorThresholds: Record<ChecklistSubject, ChecklistColorThresholds> = {} as Record<
    ChecklistSubject,
    ChecklistColorThresholds
  >
  CHECKLIST_SUBJECTS.forEach((subject) => {
    checklistColorThresholds[subject.key] = { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
  })

  // メニュー設定（デフォルト）
  const menuConfig = DEFAULT_MENU_CONFIG

  // マルキー設定（デフォルト）
  const marqueeConfig = {
    patterns: createMarqueePatterns(),
    speed: 20,
    switchIntervalMinutes: 5,
  }

  // ポモドーロカスタマイズ設定（デフォルト）
  const pomodoroCustomization = DEFAULT_POMODORO_CUSTOMIZATION

  return { tasks, exams, subjects, taskTypeMeta: TASK_TYPE_META, statusMeta: DEFAULT_STATUS_META, checklists, checklistColorThresholds, theme: 'light', studyLog: [], menuConfig, marqueeConfig, pomodoroCustomization }
}

/** 旧バージョンからの移行（試験ごとタスク構造／科目なし構造の両方に対応） */
function migrate(raw: string): AppState | null {
  try {
    const old = JSON.parse(raw) as {
      tasks?: Partial<Task>[]
      exams?: { id: string; name: string; examDate: string; color: string; tasks?: Partial<Task>[] }[]
      subjects?: Subject[]
      studyLog?: { date: string; minutes: number }[]
    }
    if (!old.exams && !old.tasks) return null

    // v1（試験ごとにタスク）→ 統合、v2 はそのまま
    const rawTasks: Partial<Task>[] = old.tasks ?? old.exams!.flatMap((e) => e.tasks ?? [])

    const subjects = old.subjects && old.subjects.length > 0 ? old.subjects : seedSubjects()

    const orderCounter: Record<Status, number> = { todo: 0, learning: 0, review: 0, done: 0 }
    const tasks: Task[] = rawTasks.map((t) => {
      const status = (t.status ?? 'todo') as Status
      const title = t.title ?? '無題のタスク'
      return {
        id: t.id ?? uid(),
        title,
        note: t.note ?? '',
        status,
        subjectId: t.subjectId ?? inferSubjectId(title, subjects),
        type: t.type ?? null,
        order: orderCounter[status]++,
        studyMinutes: t.studyMinutes ?? 0,
        createdAt: t.createdAt ?? todayStr(),
        completedAt: t.completedAt,
      }
    })

    const exams: Exam[] = (old.exams ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      examDate: e.examDate,
      color: e.color,
    }))

    const studyLog = (old.studyLog ?? []).map((l) => ({ date: l.date, minutes: l.minutes }))
    const taskTypeMeta = TASK_TYPE_META

    // 旧形式の checklist を minpou1 に移行
    const checklists: Record<ChecklistSubject, any[]> = {
      minpou1: ((old as any).checklist as any[]) ?? [],
      minpou2: [],
      keihoi: [],
      kenshou: [],
      gyousei: [],
      shougou: [],
      minjisoshou: [],
      keijisoshou: [],
      ippanchiski: [],
    }

    // デフォルト色分け設定
    const checklistColorThresholds: Record<ChecklistSubject, ChecklistColorThresholds> = {} as Record<
      ChecklistSubject,
      ChecklistColorThresholds
    >
    CHECKLIST_SUBJECTS.forEach((subject) => {
      checklistColorThresholds[subject.key] = { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
    })

    // メニュー設定（デフォルト）
    const menuConfig = DEFAULT_MENU_CONFIG

    // マルキー設定（デフォルト）
    const marqueeConfig = {
      patterns: createMarqueePatterns(),
      speed: 20,
      switchIntervalMinutes: 5,
    }

    // ポモドーロカスタマイズ設定（デフォルト）
    const pomodoroCustomization = DEFAULT_POMODORO_CUSTOMIZATION

    return { tasks, exams, subjects, taskTypeMeta, statusMeta: DEFAULT_STATUS_META, checklists, checklistColorThresholds, theme: 'light', studyLog, menuConfig, marqueeConfig, pomodoroCustomization }
  } catch {
    return null
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.tasks && parsed.exams && parsed.subjects) {
        // type フィールドがない tasks に type: null を追加（後方互換性）
        const tasks = parsed.tasks.map((t: any) => ({
          ...t,
          type: 'type' in t ? t.type : null,
        }))
        // taskTypeMeta がない場合はデフォルト値を使う
        const taskTypeMeta = parsed.taskTypeMeta ?? TASK_TYPE_META

        // checklists がない場合は空にする。旧形式から新形式へ移行
        let checklists = parsed.checklists ?? {}

        // 旧形式のキーをチェック（単一の minpou キーがある場合）
        const hasSingleMinpou = ('minpou' in checklists) && !('minpou1' in checklists)
        const hasVeryOldFormat = ('minpou1' in checklists && 'minpou2' in checklists && 'minpou3' in checklists) || ('keihousou' in checklists) || ('keihokakuron' in checklists)

        if (hasSingleMinpou) {
          // 以前の統合形式（minpou）は民法Ⅰに統合
          const oldMinpou = (checklists as any).minpou as any[]
          checklists = {
            minpou1: oldMinpou,
            minpou2: [],
            keihoi: checklists.keihoi ?? [],
            kenshou: checklists.kenshou ?? [],
            gyousei: checklists.gyousei ?? [],
            shougou: checklists.shougou ?? [],
            minjisoshou: checklists.minjisoshou ?? [],
            keijisoshou: checklists.keijisoshou ?? [],
            ippanchiski: checklists.ippanchiski ?? [],
          }
        } else if (hasVeryOldFormat) {
          // 最も古い形式から新形式へ移行
          const oldKeihoi = [...((checklists as any).keihousou ?? []), ...((checklists as any).keihokakuron ?? [])]
          checklists = {
            minpou1: (checklists.minpou1 ?? []).concat(checklists.minpou2 ?? []),
            minpou2: [],
            keihoi: oldKeihoi,
            kenshou: checklists.kenshou ?? [],
            gyousei: checklists.gyousei ?? [],
            shougou: checklists.shougou ?? [],
            minjisoshou: checklists.minjisoshou ?? [],
            keijisoshou: checklists.keijisoshou ?? [],
            ippanchiski: checklists.ippanchiski ?? [],
          }
        } else {
          // 新形式：minpou1 と minpou2 を保持（分割されたままにする）
          checklists = {
            minpou1: checklists.minpou1 ?? [],
            minpou2: checklists.minpou2 ?? [],
            keihoi: checklists.keihoi ?? [],
            kenshou: checklists.kenshou ?? [],
            gyousei: checklists.gyousei ?? [],
            shougou: checklists.shougou ?? [],
            minjisoshou: checklists.minjisoshou ?? [],
            keijisoshou: checklists.keijisoshou ?? [],
            ippanchiski: checklists.ippanchiski ?? [],
          }
        }
        // checklistColorThresholds がない場合はデフォルト値を使う
        const checklistColorThresholds = parsed.checklistColorThresholds ?? {}
        const initChecklistColorThresholds: Record<ChecklistSubject, ChecklistColorThresholds> = {} as Record<
          ChecklistSubject,
          ChecklistColorThresholds
        >
        CHECKLIST_SUBJECTS.forEach((subject) => {
          initChecklistColorThresholds[subject.key] = checklistColorThresholds[subject.key] ?? { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
        })

        // menuConfig がない場合はデフォルト値を使う
        // 既存の menuConfig がある場合は、新しいメニュー項目を追加（timer）
        let menuConfig = parsed.menuConfig ?? DEFAULT_MENU_CONFIG
        const existingKeys = new Set(menuConfig.map((m: any) => m.key))
        if (!existingKeys.has('timer')) {
          // timer メニューを既存の config に追加
          menuConfig = [
            ...menuConfig.map((m: any) => (m.key === 'calendar' ? { ...m, order: m.order + 1 } : m)),
            { key: 'timer' as const, label: 'ポモドーロ', visible: true, order: 4 },
          ]
        }

        // marqueeConfig がない、または patterns がない場合はデフォルト値を使う
        const defaultMarqueeConfig = {
          patterns: createMarqueePatterns(),
          speed: 20,
          switchIntervalMinutes: 5,
        }
        const marqueeConfig =
          parsed.marqueeConfig && Array.isArray(parsed.marqueeConfig.patterns) && parsed.marqueeConfig.patterns.length > 0
            ? parsed.marqueeConfig
            : defaultMarqueeConfig

        // pomodoroCustomization がない場合はデフォルト値を使う
        const pomodoroCustomization = parsed.pomodoroCustomization ?? DEFAULT_POMODORO_CUSTOMIZATION

        return { ...parsed, tasks, taskTypeMeta, statusMeta: parsed.statusMeta ?? DEFAULT_STATUS_META, checklists, checklistColorThresholds: initChecklistColorThresholds, theme: parsed.theme ?? 'light', menuConfig, marqueeConfig, pomodoroCustomization }
      }
    }
    // 旧データがあれば移行
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key)
      if (legacy) {
        const migrated = migrate(legacy)
        if (migrated) {
          saveState(migrated)
          return migrated
        }
      }
    }
    return seedState()
  } catch {
    return seedState()
  }
}

export function saveState(state: AppState): void {
  try {
    // タイムスタンプを追加（デバイス間の最新データ判定に使用）
    const now = Date.now()
    const stateWithTimestamp = {
      ...state,
      lastUpdatedAt: now,
    }

    // localStorage に保存（オフライン用）
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp))

    // Firebase に保存（クラウド同期用）
    saveToFirebase(stateWithTimestamp).catch((error) => {
      console.error('Failed to save to Firebase:', error)
    })
  } catch {
    // 保存容量超過などは握りつぶす
  }
}
