import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, onValue } from 'firebase/database'
import type { AppState } from './types'

const firebaseConfig = {
  apiKey: 'AIzaSyCJscBdvgZzo9kZBJlmzwVciV92aLDzu1Y',
  authDomain: 'study-task-app-125f0.firebaseapp.com',
  databaseURL: 'https://study-task-app-125f0-default-rtdb.firebaseio.com',
  projectId: 'study-task-app-125f0',
  storageBucket: 'study-task-app-125f0.appspot.com',
  messagingSenderId: '189326712978',
  appId: '1:189326712978:web:3cfd7a17ab6c6797e4c64b',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Get database reference
export const db = getDatabase(app)

// ユーザー ID（IndexedDB で永続化、localStorage はバックアップのみ）
let cachedUserId: string | null = null

export const getUserId = () => {
  if (cachedUserId) return cachedUserId

  // Try localStorage first
  let userId = localStorage.getItem('app:userId')
  if (userId) {
    cachedUserId = userId
    return userId
  }

  // Try IndexedDB as fallback (survives localStorage clear)
  if (typeof window !== 'undefined' && window.indexedDB) {
    const dbRequest = window.indexedDB.open('StudyAppDB', 1)

    dbRequest.onsuccess = (event: any) => {
      try {
        const db = event.target.result
        const transaction = db.transaction(['config'], 'readonly')
        const store = transaction.objectStore('config')
        const request = store.get('userId')

        request.onsuccess = () => {
          if (request.result?.userId) {
            cachedUserId = request.result.userId
            if (cachedUserId) localStorage.setItem('app:userId', cachedUserId)
          }
        }
      } catch (e) {
        console.log('[UserId] IndexedDB read failed, generating new ID')
      }
    }

    dbRequest.onupgradeneeded = (event: any) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config')
      }
    }
  }

  // Generate new ID if none found
  userId = 'user_' + Math.random().toString(36).substr(2, 9)
  cachedUserId = userId
  localStorage.setItem('app:userId', userId)

  // Save to IndexedDB for persistence
  if (typeof window !== 'undefined' && window.indexedDB) {
    const dbRequest = window.indexedDB.open('StudyAppDB', 1)
    dbRequest.onsuccess = (event: any) => {
      try {
        const db = event.target.result
        const transaction = db.transaction(['config'], 'readwrite')
        const store = transaction.objectStore('config')
        store.put({ userId }, 'userId')
      } catch (e) {
        console.log('[UserId] IndexedDB write failed')
      }
    }
  }

  return userId
}

// undefined フィールドを再帰的に削除（Firebase は undefined を許可しない）
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined)
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {}
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanUndefined(obj[key])
      }
    }
    return cleaned
  }
  return obj
}

// Default values for missing fields
const DEFAULT_MARQUEE_CONFIG = {
  patterns: [],
  speed: 20,
  switchIntervalMinutes: 5,
}

const DEFAULT_POMODORO_CUSTOMIZATION = {
  learningColor: '#0ea5e9',
  breakColor: '#10b981',
  backgroundImage: null,
  backgroundOpacity: 100,
  enablePulseAnimation: true,
  soundVolume: 100,
}

const DEFAULT_MENU_CONFIG = [
  { key: 'board' as const, label: 'メインボード', visible: true, order: 0 },
  { key: 'stats' as const, label: '目標設定', visible: true, order: 1 },
  { key: 'settings' as const, label: '各種設定', visible: true, order: 2 },
  { key: 'checklist' as const, label: '学習チェックリスト', visible: true, order: 3 },
  { key: 'timer' as const, label: 'ポモドーロ', visible: true, order: 4 },
  { key: 'calendar' as const, label: 'カレンダー', visible: true, order: 5 },
]

const DEFAULT_CHECKLIST_COLOR_THRESHOLDS = {
  excellentThreshold: 80,
  goodThreshold: 60,
  excellentColor: '#ec4899',
  goodColor: '#f59e0b',
  poorColor: '#000000',
}

// Validate and repair Firebase data structure
// Ensures all required fields exist with proper defaults if missing
// This function is PERMISSIVE - it always returns valid AppState or creates defaults
// It never returns null if data exists at all
export function validateAndRepairAppState(data: any): AppState | null {
  if (!data || typeof data !== 'object') {
    console.warn('[Firebase Repair] Data is not an object')
    return null
  }

  // Import default values for repair
  const DEFAULT_STATUS_META = [
    { key: 'todo' as const, label: '未着手', hint: 'これから取り組む' },
    { key: 'learning' as const, label: '学習中', hint: 'いま勉強している' },
    { key: 'review' as const, label: '復習', hint: '繰り返し定着させる' },
    { key: 'done' as const, label: '完了', hint: 'マスターした' },
  ]

  const TASK_TYPE_META = [
    { key: 'tanpa' as const, label: '短パ', icon: '📄' },
    { key: 'shiyoku' as const, label: '肢別', icon: '✔️' },
    { key: 'moshi' as const, label: '模試', icon: '📝' },
    { key: 'text' as const, label: 'テキスト', icon: '📖' },
    { key: 'ichimondai' as const, label: '一問一答', icon: '❓' },
    { key: 'joubun' as const, label: '条文', icon: '⚖️' },
  ]

  const checklistSubjects = ['minpou1', 'minpou2', 'keihoi', 'kenshou', 'gyousei', 'shougou', 'minjisoshou', 'keijisoshou', 'ippanchiski']

  // Repair arrays - ensure they exist and are arrays
  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  const exams = Array.isArray(data.exams) ? data.exams : []
  const subjects = Array.isArray(data.subjects) ? data.subjects : []
  const statusMeta = Array.isArray(data.statusMeta) && data.statusMeta.length > 0 ? data.statusMeta : DEFAULT_STATUS_META
  const taskTypeMeta = Array.isArray(data.taskTypeMeta) && data.taskTypeMeta.length > 0 ? data.taskTypeMeta : TASK_TYPE_META
  const studyLog = Array.isArray(data.studyLog) ? data.studyLog : []

  // Repair checklists - ensure all subjects exist
  const repairedChecklists: any = {}
  for (const subject of checklistSubjects) {
    repairedChecklists[subject] = Array.isArray(data.checklists?.[subject]) ? data.checklists[subject] : []
  }

  // Repair marqueeConfig - must have patterns array, speed, and switchIntervalMinutes
  let marqueeConfig = data.marqueeConfig
  if (!marqueeConfig || typeof marqueeConfig !== 'object') {
    marqueeConfig = { ...DEFAULT_MARQUEE_CONFIG }
  } else {
    marqueeConfig = {
      patterns: Array.isArray(marqueeConfig.patterns) ? marqueeConfig.patterns : [],
      speed: typeof marqueeConfig.speed === 'number' ? marqueeConfig.speed : DEFAULT_MARQUEE_CONFIG.speed,
      switchIntervalMinutes: typeof marqueeConfig.switchIntervalMinutes === 'number' ? marqueeConfig.switchIntervalMinutes : DEFAULT_MARQUEE_CONFIG.switchIntervalMinutes,
    }
  }

  // Repair pomodoroCustomization - ensure all fields exist with proper types
  let pomodoroCustomization = data.pomodoroCustomization
  pomodoroCustomization = {
    learningColor: typeof pomodoroCustomization?.learningColor === 'string' ? pomodoroCustomization.learningColor : DEFAULT_POMODORO_CUSTOMIZATION.learningColor,
    breakColor: typeof pomodoroCustomization?.breakColor === 'string' ? pomodoroCustomization.breakColor : DEFAULT_POMODORO_CUSTOMIZATION.breakColor,
    backgroundImage: typeof pomodoroCustomization?.backgroundImage === 'string' ? pomodoroCustomization.backgroundImage : DEFAULT_POMODORO_CUSTOMIZATION.backgroundImage,
    backgroundOpacity: typeof pomodoroCustomization?.backgroundOpacity === 'number' ? pomodoroCustomization.backgroundOpacity : DEFAULT_POMODORO_CUSTOMIZATION.backgroundOpacity,
    enablePulseAnimation: typeof pomodoroCustomization?.enablePulseAnimation === 'boolean' ? pomodoroCustomization.enablePulseAnimation : DEFAULT_POMODORO_CUSTOMIZATION.enablePulseAnimation,
    soundVolume: typeof pomodoroCustomization?.soundVolume === 'number' ? pomodoroCustomization.soundVolume : DEFAULT_POMODORO_CUSTOMIZATION.soundVolume,
  }

  // Repair menuConfig - must be array with proper structure
  let menuConfig = data.menuConfig
  if (!Array.isArray(menuConfig) || menuConfig.length === 0) {
    menuConfig = [...DEFAULT_MENU_CONFIG]
  } else {
    // Validate structure of each menu item
    menuConfig = menuConfig.map((item: any) => ({
      key: item.key ?? 'board',
      label: typeof item.label === 'string' ? item.label : '学習ボード',
      visible: typeof item.visible === 'boolean' ? item.visible : true,
      order: typeof item.order === 'number' ? item.order : 0,
    }))
  }

  // Repair checklistColorThresholds - ensure all subjects have color settings
  const checklistColorThresholds: any = {}
  for (const subject of checklistSubjects) {
    const existing = data.checklistColorThresholds?.[subject]
    if (existing && typeof existing === 'object') {
      checklistColorThresholds[subject] = {
        excellentThreshold: typeof existing.excellentThreshold === 'number' ? existing.excellentThreshold : DEFAULT_CHECKLIST_COLOR_THRESHOLDS.excellentThreshold,
        goodThreshold: typeof existing.goodThreshold === 'number' ? existing.goodThreshold : DEFAULT_CHECKLIST_COLOR_THRESHOLDS.goodThreshold,
        excellentColor: typeof existing.excellentColor === 'string' ? existing.excellentColor : DEFAULT_CHECKLIST_COLOR_THRESHOLDS.excellentColor,
        goodColor: typeof existing.goodColor === 'string' ? existing.goodColor : DEFAULT_CHECKLIST_COLOR_THRESHOLDS.goodColor,
        poorColor: typeof existing.poorColor === 'string' ? existing.poorColor : DEFAULT_CHECKLIST_COLOR_THRESHOLDS.poorColor,
      }
    } else {
      checklistColorThresholds[subject] = { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
    }
  }

  // Repair theme
  const theme = data.theme === 'dark' ? 'dark' : 'light'

  // Repair lastUpdatedAt - keep it if it's a number, otherwise omit
  const lastUpdatedAt = typeof data.lastUpdatedAt === 'number' ? data.lastUpdatedAt : undefined

  // Construct repaired AppState - all fields must be present
  const repairedData: AppState = {
    tasks,
    exams,
    subjects,
    taskTypeMeta,
    statusMeta,
    checklists: repairedChecklists,
    checklistColorThresholds,
    theme,
    studyLog,
    menuConfig,
    marqueeConfig,
    pomodoroCustomization,
    logs: Array.isArray(data.logs) ? data.logs : [],
    monthGoals: typeof data.monthGoals === 'object' ? data.monthGoals : {},
    weekGoals: data.weekGoals || { focus: [], note: '' },
    quota: data.quota || { weekday: 50, weekend: 100 },
    goals: Array.isArray(data.goals) ? data.goals : [],
    subjectFields: typeof data.subjectFields === 'object' ? data.subjectFields : {},
    goalAlertMessages: typeof data.goalAlertMessages === 'object' ? data.goalAlertMessages : {},
    lastUpdatedAt,
  }

  console.log('[Firebase Repair] Data repaired successfully - all fields present and valid')
  return repairedData
}

// Firebase にデータを保存
export const saveToFirebase = async (data: any) => {
  try {
    const userId = getUserId()
    // undefined フィールドを削除（Firebase は undefined を許可しない）
    const cleanData = cleanUndefined(data)
    await set(ref(db, `users/${userId}/data`), cleanData)
  } catch (error) {
    console.error('Firebase save error:', error)
  }
}

// Firebase からデータを読み込み
export const loadFromFirebase = async () => {
  try {
    const userId = getUserId()
    const snapshot = await get(ref(db, `users/${userId}/data`))
    if (snapshot.exists()) {
      const data = snapshot.val()
      // Repair and validate the data to ensure all required fields exist
      const repairedData = validateAndRepairAppState(data)
      if (repairedData) {
        console.log('[Firebase] Data repaired successfully')
        return repairedData
      } else {
        console.warn('[Firebase] Data validation failed - structure is invalid')
        return null
      }
    }
    return null
  } catch (error) {
    console.error('Firebase load error:', error)
    return null
  }
}

// Firebase でリアルタイム同期（リスナー登録）
export const subscribeToFirebase = (callback: (data: AppState) => void) => {
  try {
    const userId = getUserId()
    console.log('Firebase subscribe started for user:', userId)

    const unsubscribe = onValue(
      ref(db, `users/${userId}/data`),
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val()
          console.log('[Firebase Listener] Data received from Firebase')

          // Repair and validate the data before passing to callback
          const repairedData = validateAndRepairAppState(rawData)
          if (repairedData) {
            console.log('[Firebase Listener] Data validated and repaired successfully')
            callback(repairedData)
          } else {
            console.warn('[Firebase Listener] Data validation failed - will not update state')
          }
        }
      },
      (error) => {
        console.error('Firebase subscription error:', error)
      }
    )
    return unsubscribe
  } catch (error) {
    console.error('Firebase subscribe error:', error)
    return () => {}
  }
}
