import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, Exam, Status, Subject, Task, ChecklistSubject, ChecklistColorThresholds } from './types'
import { loadState, saveState, inferSubjectId, createEmptyState } from './storage'
import { uid, todayStr } from './utils'
import { loadFromFirebase } from './firebase'

export function useStore() {
  // Start with empty state to avoid rendering stale data while Firebase loads
  const [state, setState] = useState<AppState>(() => createEmptyState())
  const [initialized, setInitialized] = useState(false)
  const isUpdatingFromFirebase = useRef(false)
  const firebaseLoadCompletedRef = useRef(false)

  // Firebase is the ONLY source of truth for app data
  // All state changes must go through Firebase
  useEffect(() => {
    let isMounted = true

    const initializeFromFirebase = async () => {
      try {
        console.log('[Firebase Init] Starting initial Firebase load...')
        const firebaseData = await loadFromFirebase()

        if (!isMounted) return

        if (firebaseData) {
          // Firebase data is the ONLY source - no localStorage comparison
          console.log('[Firebase Init] Firebase data loaded successfully, using Firebase as source of truth')
          isUpdatingFromFirebase.current = true
          setState(firebaseData)
        } else {
          // No Firebase data - start with empty state
          console.log('[Firebase Init] No data in Firebase, starting with empty state')
          isUpdatingFromFirebase.current = true
          setState(createEmptyState())
        }

        firebaseLoadCompletedRef.current = true
        // Wait for listener to receive first data (max 3 seconds)
        setTimeout(() => {
          if (isMounted && !initialized) {
            console.log('[Firebase Init] Initial load timeout - forcing initialization')
            setInitialized(true)
          }
        }, 3000)
      } catch (error) {
        console.error('[Firebase Init] Failed to load from Firebase:', error)
        // If Firebase fails completely, still start with empty state
        if (isMounted) {
          console.log('[Firebase Init] Error occurred, starting with empty state')
          isUpdatingFromFirebase.current = true
          setState(createEmptyState())
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

  // Save to Firebase when state changes (but NOT to localStorage)
  // Debounce to prevent rapid successive saves
  useEffect(() => {
    if (isUpdatingFromFirebase.current) {
      isUpdatingFromFirebase.current = false
      return
    }

    // User made a change - save to Firebase after a short delay (debounce)
    const timeoutId = setTimeout(() => {
      console.log('[State Update] Saving to Firebase after debounce, timestamp:', state.lastUpdatedAt)
      saveState(state)
    }, 500) // Wait 500ms before saving to catch any rapid updates

    return () => clearTimeout(timeoutId)
  }, [state])

  // Mark initialization complete after initial Firebase load
  useEffect(() => {
    if (firebaseLoadCompletedRef.current && !initialized) {
      console.log('[Init] Firebase initial load complete - marking as initialized')
      setInitialized(true)
    }
  }, [initialized])

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
        console.log('[Reload] Firebase data received, updating state')

        setState((prevState) => {
          console.log('[Reload] Using Firebase data as source of truth')
          isUpdatingFromFirebase.current = true
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
