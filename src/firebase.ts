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

// ユーザー ID（ブラウザストレージから取得または生成）
export const getUserId = () => {
  let userId = localStorage.getItem('app:userId')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('app:userId', userId)
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
  { key: 'board' as const, label: '学習ボード', visible: true, order: 0 },
  { key: 'stats' as const, label: '統計', visible: true, order: 1 },
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
export function validateAndRepairAppState(data: any): AppState | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  // Check basic structure - these are critical fields that must exist
  if (
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.exams) ||
    !Array.isArray(data.subjects) ||
    !Array.isArray(data.statusMeta) ||
    typeof data.checklists !== 'object'
  ) {
    return null
  }

  // Ensure all checklist subjects exist
  const checklistSubjects = ['minpou1', 'minpou2', 'keihoi', 'kenshou', 'gyousei', 'shougou', 'minjisoshou', 'keijisoshou', 'ippanchiski']
  const repairedChecklists: any = {}
  for (const subject of checklistSubjects) {
    repairedChecklists[subject] = Array.isArray(data.checklists[subject]) ? data.checklists[subject] : []
  }

  // Repair marqueeConfig if missing or incomplete
  let marqueeConfig = data.marqueeConfig
  if (!marqueeConfig || typeof marqueeConfig !== 'object') {
    marqueeConfig = { ...DEFAULT_MARQUEE_CONFIG }
  } else {
    // Ensure required marquee fields exist
    if (!Array.isArray(marqueeConfig.patterns)) {
      marqueeConfig.patterns = []
    }
    if (typeof marqueeConfig.speed !== 'number') {
      marqueeConfig.speed = DEFAULT_MARQUEE_CONFIG.speed
    }
    if (typeof marqueeConfig.switchIntervalMinutes !== 'number') {
      marqueeConfig.switchIntervalMinutes = DEFAULT_MARQUEE_CONFIG.switchIntervalMinutes
    }
  }

  // Repair pomodoroCustomization if missing or incomplete
  let pomodoroCustomization = data.pomodoroCustomization
  if (!pomodoroCustomization || typeof pomodoroCustomization !== 'object') {
    pomodoroCustomization = { ...DEFAULT_POMODORO_CUSTOMIZATION }
  } else {
    // Ensure all required pomodoro fields exist with defaults
    pomodoroCustomization = {
      learningColor: pomodoroCustomization.learningColor ?? DEFAULT_POMODORO_CUSTOMIZATION.learningColor,
      breakColor: pomodoroCustomization.breakColor ?? DEFAULT_POMODORO_CUSTOMIZATION.breakColor,
      backgroundImage: pomodoroCustomization.backgroundImage ?? DEFAULT_POMODORO_CUSTOMIZATION.backgroundImage,
      backgroundOpacity: typeof pomodoroCustomization.backgroundOpacity === 'number' ? pomodoroCustomization.backgroundOpacity : DEFAULT_POMODORO_CUSTOMIZATION.backgroundOpacity,
      enablePulseAnimation: typeof pomodoroCustomization.enablePulseAnimation === 'boolean' ? pomodoroCustomization.enablePulseAnimation : DEFAULT_POMODORO_CUSTOMIZATION.enablePulseAnimation,
      soundVolume: typeof pomodoroCustomization.soundVolume === 'number' ? pomodoroCustomization.soundVolume : DEFAULT_POMODORO_CUSTOMIZATION.soundVolume,
    }
  }

  // Repair menuConfig if missing
  let menuConfig = data.menuConfig
  if (!Array.isArray(menuConfig) || menuConfig.length === 0) {
    menuConfig = [...DEFAULT_MENU_CONFIG]
  }

  // Repair checklistColorThresholds if missing
  const checklistColorThresholds: any = data.checklistColorThresholds || {}
  for (const subject of checklistSubjects) {
    if (!checklistColorThresholds[subject]) {
      checklistColorThresholds[subject] = { ...DEFAULT_CHECKLIST_COLOR_THRESHOLDS }
    }
  }

  // Construct repaired AppState
  const repairedData: AppState = {
    tasks: data.tasks || [],
    exams: data.exams || [],
    subjects: data.subjects || [],
    taskTypeMeta: data.taskTypeMeta || [],
    statusMeta: data.statusMeta || [],
    checklists: repairedChecklists,
    checklistColorThresholds,
    theme: data.theme === 'dark' ? 'dark' : 'light',
    studyLog: Array.isArray(data.studyLog) ? data.studyLog : [],
    menuConfig,
    marqueeConfig,
    pomodoroCustomization,
    lastUpdatedAt: data.lastUpdatedAt,
  }

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
