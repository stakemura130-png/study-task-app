import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, Exam, Status, Subject, Task, ChecklistSubject, ChecklistColorThresholds } from './types'
import { loadState, saveState, inferSubjectId, createEmptyState } from './storage'
import { uid, todayStr } from './utils'
import { subscribeToFirebase, loadFromFirebase } from './firebase'

export function useStore() {
  // Start with empty state to avoid rendering stale localStorage data while Firebase loads
  const [state, setState] = useState<AppState>(() => createEmptyState())
  const [initialized, setInitialized] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const isUpdatingFromFirebase = useRef(false)
  const initialFirebaseLoadRef = useRef(false)
  const firebaseLoadCompletedRef = useRef(false)
  const listenerFirstDataRef = useRef(false)

  // 起動時に Firebase から最新データを読み込む（必ず実行）
  // Firebase を最優先のデータソースとして扱う
  useEffect(() => {
    let isMounted = true

    const initializeFromFirebase = async () => {
      try {
        console.log('[Firebase Init] Starting initial Firebase load...')
        const firebaseData = await loadFromFirebase()

        if (!isMounted) return

        // Firebase にデータが存在する場合、それを最優先で使用
        // loadFromFirebase already validates and repairs the data, so we just check if it's null
        if (firebaseData) {
          console.log('[Firebase Init] Firebase has valid data, using it as primary source')
          isUpdatingFromFirebase.current = true
          setState(firebaseData)
          localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
        } else {
          // Firebase が空の場合は localStorage から読み込み
          console.log('[Firebase Init] Firebase is empty or invalid, falling back to localStorage')
          const localState = loadState()
          isUpdatingFromFirebase.current = true
          setState(localState)
        }

        firebaseLoadCompletedRef.current = true
        // listener が最初のデータを受け取るまで待つ（最大3秒）
        setTimeout(() => {
          if (isMounted && !initialized) {
            console.log('[Firebase Init] Initial load timeout - forcing initialization')
            setInitialized(true)
          }
        }, 3000)
      } catch (error) {
        console.error('[Firebase Init] Failed to load from Firebase:', error)
        // エラー時は localStorage から復帰
        if (isMounted) {
          console.log('[Firebase Init] Error occurred, falling back to localStorage')
          const localState = loadState()
          isUpdatingFromFirebase.current = true
          setState(localState)
          firebaseLoadCompletedRef.current = true
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
  // Listener から最初のデータを受け取るまで initialized は false に保つ
  useEffect(() => {
    let isMounted = true
    let listenerReadyTimeout: NodeJS.Timeout | null = null

    const unsubscribe = subscribeToFirebase((firebaseData) => {
      if (!isMounted) return

      // subscribeToFirebase already validates and repairs the data
      // If we reach here, firebaseData is guaranteed to be a valid AppState
      if (!firebaseData) {
        console.warn('[Firebase Sync] Invalid Firebase data received (null/undefined)')
        return
      }

      // タイムスタンプで比較：Firebase の方が新しい場合のみ更新
      const firebaseTimestamp = firebaseData.lastUpdatedAt ?? 0

      setState((prevState) => {
        const localTimestamp = prevState.lastUpdatedAt ?? 0

        console.log('[Firebase Sync] Comparing timestamps - Firebase:', firebaseTimestamp, 'Local:', localTimestamp)

        // Firebase の方が新しい場合は ALWAYS 更新
        if (firebaseTimestamp > localTimestamp) {
          console.log('[Firebase Sync] Firebase is newer - updating state')
          isUpdatingFromFirebase.current = true
          localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
          return firebaseData
        } else if (firebaseTimestamp === localTimestamp && !listenerFirstDataRef.current) {
          // 初回データ受け取り時は同じタイムスタンプでも同期（確認用）
          console.log('[Firebase Sync] Initial data received (same timestamp) - updating state')
          isUpdatingFromFirebase.current = true
          localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
          return firebaseData
        } else if (firebaseTimestamp < localTimestamp && !listenerFirstDataRef.current) {
          // 初回データ受け取り時で Firebase が古い場合は local のまま
          console.log('[Firebase Sync] Initial data received but local is newer - keeping local data')
        }

        return prevState
      })

      // リスナーから最初のデータを受け取った時点でマーク
      if (!listenerFirstDataRef.current) {
        listenerFirstDataRef.current = true
        setFirebaseReady(true)

        // Clear the timeout if it was set
        if (listenerReadyTimeout) {
          clearTimeout(listenerReadyTimeout)
          listenerReadyTimeout = null
        }

        // 初期ロード完了していたら即座に initialized を true に
        if (firebaseLoadCompletedRef.current) {
          console.log('[Firebase Sync] Both Firebase load and listener ready - initialization complete')
          setInitialized(true)
        }
      }
    })

    // Safety timeout: If listener hasn't received valid data after 3 seconds,
    // mark it as ready anyway to prevent infinite loading
    // This handles cases where Firebase data keeps failing validation
    listenerReadyTimeout = setTimeout(() => {
      if (isMounted && !listenerFirstDataRef.current) {
        console.warn('[Firebase Sync] Listener timeout - marking as ready with current state')
        listenerFirstDataRef.current = true
        setFirebaseReady(true)

        if (firebaseLoadCompletedRef.current) {
          console.log('[Firebase Sync] Timeout reached - initialization complete with fallback')
          setInitialized(true)
        }
      }
    }, 3000)

    return () => {
      isMounted = false
      if (listenerReadyTimeout) {
        clearTimeout(listenerReadyTimeout)
      }
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
      // loadFromFirebase already validates and repairs the data
      if (firebaseData) {
        console.log('[Reload] Firebase data received, comparing timestamps')

        setState((prevState) => {
          const firebaseTimestamp = firebaseData.lastUpdatedAt ?? 0
          const localTimestamp = prevState.lastUpdatedAt ?? 0

          console.log('[Reload] Firebase timestamp:', firebaseTimestamp, 'Local:', localTimestamp)

          // 手動更新なので Firebase のデータを ALWAYS 優先
          console.log('[Reload] Manual refresh - always use Firebase data')
          isUpdatingFromFirebase.current = true
          localStorage.setItem('study-task-app:v3', JSON.stringify(firebaseData))
          return firebaseData
        })
      } else {
        console.log('[Reload] Firebase data is invalid or empty')
      }
    } catch (error) {
      console.error('[Reload] Failed to reload from Firebase:', error)
    }
  }, [])


  return {
    state,
    initialized,
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
