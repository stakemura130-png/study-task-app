/** 簡易ユニークID */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** ローカルタイムでの YYYY-MM-DD */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 2つの YYYY-MM-DD 間の日数（to - from）。時刻を無視して計算 */
export function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr + 'T00:00:00')
  const to = new Date(toStr + 'T00:00:00')
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/** 試験日までの残り日数（今日基準）。未設定なら null */
export function daysUntilExam(examDate: string): number | null {
  if (!examDate) return null
  return daysBetween(todayStr(), examDate)
}

/** 分を「2時間30分」のような表記に */
export function formatMinutes(min: number): string {
  if (min <= 0) return '0分'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

/** 日付文字列を「6/4(水)」のように整形 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '未設定'
  const d = new Date(dateStr + 'T00:00:00')
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`
}

/** タイトルから科目名を削除（科目割当時用）。「民法 — 人権」→ 「人権」 */
export function stripSubjectFromTitle(title: string, subjectName: string): string {
  if (!subjectName) return title
  // 科目名 + "—" パターンで始まる場合、その部分を削除
  const pattern = new RegExp(`^${subjectName}\\s*[—\\-]\\s*`)
  return title.replace(pattern, '').trim()
}

export const EXAM_COLORS = [
  '#6366f1', // 紫
  '#0ea5e9', // 青
  '#10b981', // 緑
  '#f59e0b', // 橙
  '#ef4444', // 赤
  '#ec4899', // ピンク
  '#8b5cf6', // 藍紫
  '#14b8a6', // 青緑
  '#06b6d4', // シアン
  '#f97316', // 濃橙
  '#7c3aed', // 濃紫
  '#2563eb', // 濃青
  '#059669', // 濃緑
  '#e11d48', // 濃赤
  '#d946ef', // 濃ピンク
]
