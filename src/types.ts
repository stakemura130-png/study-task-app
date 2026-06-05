export type Status = 'todo' | 'learning' | 'review' | 'done'
export type TaskType = 'tanpa' | 'shiyoku' | 'moshi' | 'text' | 'ichimondai' | 'joubun'

/** 科目（民法・商法など）。カードの色分けに使う。 */
export interface Subject {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  /** 自由記述メモ（Note風） */
  note: string
  status: Status
  /** 所属する科目（未設定なら null） */
  subjectId: string | null
  /** タスクの種類（短パ・肢別など、未設定なら null） */
  type: TaskType | null
  /** 同一カラム内での並び順 */
  order: number
  /** 累計学習時間（分） */
  studyMinutes: number
  createdAt: string
  completedAt?: string
}

export const TASK_TYPE_META: { key: TaskType; label: string; icon: string }[] = [
  { key: 'tanpa', label: '短パ', icon: '📄' },
  { key: 'shiyoku', label: '肢別', icon: '✔️' },
  { key: 'moshi', label: '模試', icon: '📝' },
  { key: 'text', label: 'テキスト', icon: '📖' },
  { key: 'ichimondai', label: '一問一答', icon: '❓' },
  { key: 'joubun', label: '条文', icon: '⚖️' },
]

/** チェックリスト科目 */
export type ChecklistSubject = 'minpou1' | 'minpou2' | 'keihoi' | 'kenshou' | 'gyousei' | 'shougou' | 'minjisoshou' | 'keijisoshou' | 'ippanchiski'

export const CHECKLIST_SUBJECTS: { key: ChecklistSubject; label: string }[] = [
  { key: 'minpou1', label: '民法Ⅰ' },
  { key: 'minpou2', label: '民法Ⅱ' },
  { key: 'keihoi', label: '刑法' },
  { key: 'kenshou', label: '憲法' },
  { key: 'gyousei', label: '行政法' },
  { key: 'shougou', label: '商法・会社法' },
  { key: 'minjisoshou', label: '民事訴訟法' },
  { key: 'keijisoshou', label: '刑事訴訟法' },
  { key: 'ippanchiski', label: '一般知識' },
]

/** 試験日（カウントダウン用）。タスクは持たず、各試験は残り日数の表示のみ。 */
export interface Exam {
  id: string
  name: string
  /** 試験日（YYYY-MM-DD） 未設定なら空文字 */
  examDate: string
  /** アクセントカラー */
  color: string
  /** バッジイラスト（base64 データURL） */
  badgeImage?: string
}

/** 日付ごとの学習記録（統計・カレンダー用） */
export interface StudyEntry {
  /** YYYY-MM-DD */
  date: string
  minutes: number
}

/** 学習チェックリスト項目 */
export interface ChecklistItem {
  id: string
  questionNumber: string
  theme: string
  correctRate: number
  checked: boolean
  memo: string
  notes: string
  isNextStart?: boolean
}

/** チェックリスト色分け設定 */
export interface ChecklistColorThresholds {
  excellentThreshold: number  // 80% 以上
  goodThreshold: number       // 60% 以上 80% 未満
  excellentColor: string
  goodColor: string
  poorColor: string
}

export interface AppState {
  /** 全試験で共通の学習タスク（カンバン） */
  tasks: Task[]
  /** 試験日（カウントダウンは試験ごとに別） */
  exams: Exam[]
  /** 科目とカラー（カードの色分け） */
  subjects: Subject[]
  /** タスク種類の表示名とアイコン（編集可能） */
  taskTypeMeta: { key: TaskType; label: string; icon: string }[]
  /** ステータス（学習ボードの項目）の表示名と説明（編集可能） */
  statusMeta: { key: Status; label: string; hint: string }[]
  /** 学習チェックリスト（科目別） */
  checklists: Record<ChecklistSubject, ChecklistItem[]>
  /** チェックリストの色分け設定（科目別） */
  checklistColorThresholds: Record<ChecklistSubject, ChecklistColorThresholds>
  /** テーマ設定 */
  theme: 'light' | 'dark'
  studyLog: StudyEntry[]
  /** 最後の更新時刻（デバイス間の同期判定に使用） */
  lastUpdatedAt?: number
}

export const DEFAULT_STATUS_META: { key: Status; label: string; hint: string }[] = [
  { key: 'todo', label: '未着手', hint: 'これから取り組む' },
  { key: 'learning', label: '学習中', hint: 'いま勉強している' },
  { key: 'review', label: '復習', hint: '繰り返し定着させる' },
  { key: 'done', label: '完了', hint: 'マスターした' },
]

export const STATUS_META: { key: Status; label: string; hint: string }[] = DEFAULT_STATUS_META
