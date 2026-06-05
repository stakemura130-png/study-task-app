import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, onValue } from 'firebase/database'

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
      return snapshot.val()
    }
    return null
  } catch (error) {
    console.error('Firebase load error:', error)
    return null
  }
}

// Firebase でリアルタイム同期（リスナー登録）
export const subscribeToFirebase = (callback: (data: any) => void) => {
  try {
    const userId = getUserId()
    console.log('Firebase subscribe started for user:', userId)

    const unsubscribe = onValue(
      ref(db, `users/${userId}/data`),
      (snapshot) => {
        console.log('Firebase data received:', snapshot.val())
        if (snapshot.exists()) {
          callback(snapshot.val())
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
