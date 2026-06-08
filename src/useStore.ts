import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, Exam, Status, Subject, Task, ChecklistSubject, ChecklistColorThresholds } from './types'
import { loadState, saveState, inferSubjectId } from './storage'
import { uid, todayStr } from './utils'
import { subscribeToFirebase, loadFromFirebase } from './firebase'

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [initialized, setInitialized] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const isUpdatingFromFirebase = useRef(false)
  const initialFirebaseLoadRef = useRef(false)

  // 起動時に Firebase から最新データを読み込む（必ず実行）
  useEffect(() => {
    let isMounted = true

    const initializeFromFirebase = async () => {
      try {
        console.log('[Firebase Init] Starting initial Firebase load...')
        const firebaseData = await loadFromFirebase()
        if (isMounted) {
          if (firebaseData &&
              firebaseData.tasks && Array.isArray(firebaseData.tasks) &&
              firebaseData.exams && Array.isArray(firebaseData.exams) &&
              firebaseData.subjects && Array.isArray(firebaseData.subjects) &&
              firebaseData.statusMeta && Array.isArray(firebaseData.statusMeta) &&
              firebaseData.checklists && typeof firebaseData.checklists === 'object') {
            console.log('[Firebase Init] Firebase data valid, updating state')
            // Firebase のデータが local より新しい場合のみ更新
            const localTimestamp = state.lastUpdatedAt ?? 0
            const firebaseTimestamp = firebaseData.lastUpdatedAt ?? 0

            if (firebaseTimestamp > localTimestamp) {
              console.log('[Firebase Init] Firebase is newer:', firebaseTimestamp, 'vs local:', localTimestamp)
              isUpdatingFromFirebase.current = true
              setState(firebaseData)
              localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
            } else {
              console.log('[Firebase Init] Local data is current or newer')
            }
          }
          initialFirebaseLoadRef.current = true
          // setInitialized は Firebase listener の準備完了まで待つ（下記の useEffect で実行）
        }
      } catch (error) {
        console.error('[Firebase Init] Failed to load from Firebase:', error)
        // エラー時のみ即座に initialized を true に（ローディング解除）
        if (isMounted) {
          initialFirebaseLoadRef.current = true
          setInitialized(true)
        }
      }
    }

    initializeFromFirebase()

    return () => {
      isMounted = false
    }
  }, [])

  // 変更のたびに localStorage へ保存（Firebase からの更新は除く）
  useEffect(() => {
    if (!isUpdatingFromFirebase.current) {
      saveState(state)
    } else {
      isUpdatingFromFirebase.current = false
    }
  }, [state])

  // Firebase リアルタイム同期（タイムスタンプベース）
  useEffect(() => {
    let isMounted = true
    let firstData = true

    const unsubscribe = subscribeToFirebase((firebaseData) => {
      if (!isMounted) return

      // Firebase のデータを検証
      if (!firebaseData ||
          !firebaseData.tasks || !Array.isArray(firebaseData.tasks) ||
          !firebaseData.exams || !Array.isArray(firebaseData.exams) ||
          !firebaseData.subjects || !Array.isArray(firebaseData.subjects) ||
          !firebaseData.statusMeta || !Array.isArray(firebaseData.statusMeta) ||
          !firebaseData.checklists || typeof firebaseData.checklists !== 'object') {
        console.warn('[Firebase Sync] Invalid Firebase data received')
        return
      }

      // タイムスタンプで比較：Firebase の方が新しい場合のみ更新
      const firebaseTimestamp = firebaseData.lastUpdatedAt ?? 0

      setState((prevState) => {
        const localTimestamp = prevState.lastUpdatedAt ?? 0

        console.log('[Firebase Sync] Comparing timestamps - Firebase:', firebaseTimestamp, 'Local:', localTimestamp)

        // Firebase の方が新しい場合は ALWAYS 更新（同じか古い場合は更新しない）
        if (firebaseTimestamp > localTimestamp) {
          console.log('[Firebase Sync] Firebase is newer - updating state')
          isUpdatingFromFirebase.current = true
          localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
          return firebaseData
        } else if (firebaseTimestamp === localTimestamp && firstData) {
          // 初回データ受け取り時は同じタイムスタンプでも OK（確認用）
          console.log('[Firebase Sync] Initial data received (same timestamp)')
        } else if (firebaseTimestamp < localTimestamp && firstData) {
          // 初回データ受け取り時で Firebase が古い場合は local のまま
          console.log('[Firebase Sync] Initial data received but local is newer - keeping local data')
        }

        return prevState
      })

      // リスナーから最初のデータを受け取った時点で Firebase 準備完了
      if (firstData) {
        firstData = false
        setFirebaseReady(true)
        // 初期 Firebase ロード完了後に initialized を true に設定
        if (initialFirebaseLoadRef.current) {
          setInitialized(true)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  // --- 試験日（カウントダウン）操作 ---
  const addExam = useCallback((name: string, examDate: string, color: string) => {
    const exam: Exam = { id: uid(), name, examDate, color }
    setState((s) => ({ ...s, exams: [...s.exams, exam] }))
  }, [])

  const updateExam = useCallback(
    (id: string, patch: Partial<Pick<Exam, 'name' | 'examDate' | 'color' | 'badgeImage'>>) => {
      setState((s) => ({
        ...s,
        exams: s.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
    },
    [],
  )

  const deleteExam = useCallback((id: string) => {
    // タスクは共通なので削除しない。試験日のみ削除。
    setState((s) => ({ ...s, exams: s.exams.filter((e) => e.id !== id) }))
  }, [])

  // --- 科目（カラー）操作 ---
  const addSubject = useCallback((name: string, color: string) => {
    const subject: Subject = { id: uid(), name, color }
    setState((s) => ({ ...s, subjects: [...s.subjects, subject] }))
  }, [])

  const updateSubject = useCallback(
    (id: string, patch: Partial<Pick<Subject, 'name' | 'color'>>) => {
      setState((s) => ({
        ...s,
        subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
      }))
    },
    [],
  )

  const deleteSubject = useCallback((id: string) => {
    // 削除した科目を参照するタスクは「未設定」に戻す
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((sub) => sub.id !== id),
      tasks: s.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
    }))
  }, [])

  // --- タスク（カード）操作：全試験で共通 ---
  const addTask = useCallback((title: string, status: Status) => {
    setState((s) => {
      const orderInCol = s.tasks.filter((t) => t.status === status).length
      const task: Task = {
        id: uid(),
        title,
        note: '',
        status,
        // タイトルから科目を自動推定（該当なしなら未設定）
        subjectId: inferSubjectId(title, s.subjects),
        type: null,
        order: orderInCol,
        studyMinutes: 0,
        createdAt: todayStr(),
      }
      return { ...s, tasks: [...s.tasks, task] }
    })
  }, [])

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }))
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }))
  }, [])

  /** カードを別カラム（status）へ移動。targetId が指定されればその直前に挿入 */
  const moveTask = useCallback(
    (taskId: string, toStatus: Status, targetId?: string) => {
      setState((s) => {
        const moving = s.tasks.find((t) => t.id === taskId)
        if (!moving) return s
        const isComplete = toStatus === 'done'
        const updatedMoving: Task = {
          ...moving,
          status: toStatus,
          completedAt: isComplete ? (moving.completedAt ?? todayStr()) : moving.completedAt,
        }
        const rest = s.tasks.filter((t) => t.id !== taskId)
        const colTasks = rest
          .filter((t) => t.status === toStatus)
          .sort((a, b) => a.order - b.order)
        const insertIdx =
          targetId && targetId !== taskId
            ? colTasks.findIndex((t) => t.id === targetId)
            : colTasks.length
        const idx = insertIdx === -1 ? colTasks.length : insertIdx
        colTasks.splice(idx, 0, updatedMoving)
        const reordered = colTasks.map((t, i) => ({ ...t, order: i }))
        const others = rest.filter((t) => t.status !== toStatus)
        return { ...s, tasks: [...others, ...reordered] }
      })
    },
    [],
  )

  /** 学習時間を記録（タスクの累計＋日次ログ） */
  const logStudy = useCallback((taskId: string, minutes: number) => {
    if (minutes <= 0) return
    const date = todayStr()
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, studyMinutes: t.studyMinutes + minutes } : t,
      ),
      studyLog: [...s.studyLog, { date, minutes }],
    }))
  }, [])

  const updateTaskTypeMeta = useCallback(
    (index: number, patch: Partial<{ label: string; icon: string }>) => {
      setState((s) => ({
        ...s,
        taskTypeMeta: s.taskTypeMeta.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      }))
    },
    [],
  )

  const toggleChecklistItem = useCallback((subject: string, id: string) => {
    setState((s) => ({
      ...s,
      checklists: {
        ...s.checklists,
        [subject]: (s.checklists[subject as ChecklistSubject] || []).map((item: any) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        ),
      },
    }))
  }, [])

  const updateChecklistItem = useCallback(
    (subject: string, id: string, patch: Partial<{ memo: string; checked: boolean; notes: string; isNextStart: boolean }>) => {
      setState((s) => ({
        ...s,
        checklists: {
          ...s.checklists,
          [subject]: (s.checklists[subject as ChecklistSubject] || []).map((item: any) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        },
      }))
    },
    [],
  )

  const replaceChecklistData = useCallback(
    (subject: string, items: any[]) => {
      setState((s) => ({
        ...s,
        checklists: {
          ...s.checklists,
          [subject]: items,
        },
      }))
    },
    [],
  )

  const updateChecklistColorThresholds = useCallback(
    (subject: ChecklistSubject, patch: Partial<ChecklistColorThresholds>) => {
      setState((s) => ({
        ...s,
        checklistColorThresholds: {
          ...s.checklistColorThresholds,
          [subject]: { ...s.checklistColorThresholds[subject], ...patch },
        },
      }))
    },
    [],
  )

  const updateTheme = useCallback((theme: 'light' | 'dark') => {
    setState((s) => ({
      ...s,
      theme,
    }))
  }, [])

  const updateMenuConfig = useCallback(
    (menuConfig: { key: string; label: string; visible: boolean; order: number }[]) => {
      setState((s) => ({
        ...s,
        menuConfig: menuConfig as any,
      }))
    },
    [],
  )

  const updateMarqueeConfig = useCallback(
    (marqueeConfig: Partial<{ patterns: any[]; speed: number; switchIntervalMinutes: number }>) => {
      setState((s) => ({
        ...s,
        marqueeConfig: { ...s.marqueeConfig, ...marqueeConfig },
      }))
    },
    [],
  )

  const updatePomodoroCustomization = useCallback(
    (customization: Partial<any>) => {
      setState((s) => ({
        ...s,
        pomodoroCustomization: { ...s.pomodoroCustomization, ...customization },
      }))
    },
    [],
  )

  const updateStatusMeta = useCallback(
    (index: number, patch: Partial<{ label: string; hint: string }>) => {
      setState((s) => ({
        ...s,
        statusMeta: s.statusMeta.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      }))
    },
    [],
  )

  const reloadFromFirebase = useCallback(async () => {
    try {
      console.log('[Reload] Forcing refresh from Firebase...')
      const firebaseData = await loadFromFirebase()
      if (firebaseData &&
          firebaseData.tasks && Array.isArray(firebaseData.tasks) &&
          firebaseData.exams && Array.isArray(firebaseData.exams) &&
          firebaseData.subjects && Array.isArray(firebaseData.subjects) &&
          firebaseData.statusMeta && Array.isArray(firebaseData.statusMeta) &&
          firebaseData.checklists && typeof firebaseData.checklists === 'object') {
        console.log('[Reload] Firebase data received, comparing timestamps')

        setState((prevState) => {
          const firebaseTimestamp = firebaseData.lastUpdatedAt ?? 0
          const localTimestamp = prevState.lastUpdatedAt ?? 0

          console.log('[Reload] Firebase timestamp:', firebaseTimestamp, 'Local:', localTimestamp)

          // Firebase がより新しいデータを持っている場合は更新
          if (firebaseTimestamp > localTimestamp) {
            console.log('[Reload] Firebase is newer - updating to Firebase data')
            isUpdatingFromFirebase.current = true
            localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
            return firebaseData
          } else if (firebaseTimestamp >= localTimestamp) {
            // Firebase が同じか新しい場合、確実に同期を取る
            console.log('[Reload] Syncing with Firebase data')
            isUpdatingFromFirebase.current = true
            localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
            return firebaseData
          }

          return prevState
        })
      }
    } catch (error) {
      console.error('[Reload] Failed to reload from Firebase:', error)
    }
  }, [])

  // App が focus を取得したときに Firebase から最新データを強制的に再読み込み
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Focus] App regained focus, syncing with Firebase...')
        reloadFromFirebase()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Window focus イベント（タブ切り替え）にも対応
    const handleWindowFocus = () => {
      console.log('[Focus] Window focus detected, syncing with Firebase...')
      reloadFromFirebase()
    }
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [reloadFromFirebase])

  return {
    state,
    initialized: firebaseReady,
    addExam,
    updateExam,
    deleteExam,
    addSubject,
    updateSubject,
    deleteSubject,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    logStudy,
    updateTaskTypeMeta,
    updateStatusMeta,
    toggleChecklistItem,
    updateChecklistItem,
    replaceChecklistData,
    updateChecklistColorThresholds,
    updateTheme,
    updateMenuConfig,
    updateMarqueeConfig,
    updatePomodoroCustomization,
    reloadFromFirebase,
  }
}

export type Store = ReturnType<typeof useStore>
