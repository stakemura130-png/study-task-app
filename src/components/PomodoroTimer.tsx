import { useEffect, useRef, useState } from 'react'

type AlarmSound = 'bell' | 'beep' | 'chime' | 'notification' | 'alarm'

interface PomodoroPattern {
  name: string
  studyDuration: number
  breakDuration: number
}

interface PomodoroState {
  sets: number
  currentSet: number
  timeLeft: number
  isRunning: boolean
  isBreak: boolean
  alarmSound: AlarmSound
  patternId: string
}

const POMODORO_PATTERNS: { [key: string]: PomodoroPattern } = {
  standard: {
    name: '25分+5分（標準）',
    studyDuration: 25 * 60,
    breakDuration: 5 * 60,
  },
  short: {
    name: '15分+3分（短時間）',
    studyDuration: 15 * 60,
    breakDuration: 3 * 60,
  },
  long: {
    name: '50分+10分（長時間）',
    studyDuration: 50 * 60,
    breakDuration: 10 * 60,
  },
  ultra: {
    name: '90分+15分（ウルトラディアンリズム）',
    studyDuration: 90 * 60,
    breakDuration: 15 * 60,
  },
}

const STUDY_DURATION = POMODORO_PATTERNS.standard.studyDuration
const BREAK_DURATION = POMODORO_PATTERNS.standard.breakDuration

const ALARM_OPTIONS: { value: AlarmSound; label: string }[] = [
  { value: 'bell', label: 'ベル' },
  { value: 'beep', label: 'ビープ' },
  { value: 'chime', label: 'チャイム' },
  { value: 'notification', label: '通知音' },
  { value: 'alarm', label: 'アラーム' },
]

// Web Audio API でアラーム音を生成
function playAlarmSound(soundType: AlarmSound) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const currentTime = audioContext.currentTime

    switch (soundType) {
      case 'bell': {
        // ベル音: 880Hz と 1320Hz の周波数
        const osc1 = audioContext.createOscillator()
        const osc2 = audioContext.createOscillator()
        const gain = audioContext.createGain()

        osc1.frequency.value = 880
        osc2.frequency.value = 1320
        gain.gain.setValueAtTime(0.3, currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 1)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(audioContext.destination)

        osc1.start(currentTime)
        osc2.start(currentTime)
        osc1.stop(currentTime + 1)
        osc2.stop(currentTime + 1)
        break
      }

      case 'beep': {
        // ビープ音: 1000Hz の短いビープ (3回)
        const gains = []
        for (let i = 0; i < 3; i++) {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          gains.push(gain)

          osc.frequency.value = 1000
          gain.gain.setValueAtTime(0.2, currentTime + i * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + i * 0.15 + 0.1)

          osc.connect(gain)
          gain.connect(audioContext.destination)

          osc.start(currentTime + i * 0.15)
          osc.stop(currentTime + i * 0.15 + 0.1)
        }
        break
      }

      case 'chime': {
        // チャイム音: 下降する3つの音
        const frequencies = [800, 600, 400]
        const gains = []

        frequencies.forEach((freq, index) => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          gains.push(gain)

          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.25, currentTime + index * 0.2)
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + index * 0.2 + 0.3)

          osc.connect(gain)
          gain.connect(audioContext.destination)

          osc.start(currentTime + index * 0.2)
          osc.stop(currentTime + index * 0.2 + 0.3)
        })
        break
      }

      case 'notification': {
        // 通知音: 上昇する2つの音
        const frequencies = [600, 900]
        const gains = []

        frequencies.forEach((freq, index) => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          gains.push(gain)

          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.2, currentTime + index * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + index * 0.15 + 0.2)

          osc.connect(gain)
          gain.connect(audioContext.destination)

          osc.start(currentTime + index * 0.15)
          osc.stop(currentTime + index * 0.15 + 0.2)
        })
        break
      }

      case 'alarm': {
        // アラーム音: 連続的な高い音
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()

        osc.frequency.setValueAtTime(1200, currentTime)
        osc.frequency.setValueAtTime(1000, currentTime + 0.1)

        gain.gain.setValueAtTime(0.3, currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8)

        osc.connect(gain)
        gain.connect(audioContext.destination)

        osc.start(currentTime)
        osc.stop(currentTime + 0.8)
        break
      }
    }
  } catch (error) {
    console.error('Failed to play alarm sound:', error)
    // フォールバック: ブラウザのビープ
    ;(window as any).AudioContext?.prototype?.beep?.()
  }
}

export function PomodoroTimer() {
  const [state, setState] = useState<PomodoroState>({
    sets: 3,
    currentSet: 1,
    timeLeft: STUDY_DURATION,
    isRunning: false,
    isBreak: false,
    alarmSound: 'bell',
    patternId: 'standard',
  })

  const [inputSets, setInputSets] = useState('3')
  const [showCompletion, setShowCompletion] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasPlayedRef = useRef(false)

  const currentPattern = POMODORO_PATTERNS[state.patternId]

  // タイマーロジック
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setState((prevState) => {
        const newTimeLeft = prevState.timeLeft - 1

        // タイムアップ時の処理
        if (newTimeLeft <= 0) {
          if (!hasPlayedRef.current) {
            hasPlayedRef.current = true
            playAlarmSound(prevState.alarmSound)
          }

          // セット完了時
          if (prevState.isBreak) {
            // 休憩が終わった
            if (prevState.currentSet >= prevState.sets) {
              // 全セット完了
              return {
                ...prevState,
                isRunning: false,
                timeLeft: 0,
              }
            }
            // 次のセットへ（学習開始）
            hasPlayedRef.current = false
            const pattern = POMODORO_PATTERNS[prevState.patternId]
            return {
              ...prevState,
              currentSet: prevState.currentSet + 1,
              timeLeft: pattern.studyDuration,
              isBreak: false,
            }
          } else {
            // 学習時間が終わった、休憩へ
            hasPlayedRef.current = false
            const pattern = POMODORO_PATTERNS[prevState.patternId]
            return {
              ...prevState,
              timeLeft: pattern.breakDuration,
              isBreak: true,
            }
          }
        }

        return { ...prevState, timeLeft: newTimeLeft }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isRunning])

  // 全セット完了の判定
  useEffect(() => {
    if (!state.isRunning && state.currentSet > state.sets && state.timeLeft === 0) {
      setShowCompletion(true)
      const timer = setTimeout(() => setShowCompletion(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [state])

  const handleStart = () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
    }))
  }

  const handlePause = () => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
    }))
  }

  const handleReset = () => {
    const pattern = POMODORO_PATTERNS[state.patternId]
    setState({
      sets: parseInt(inputSets) || 3,
      currentSet: 1,
      timeLeft: pattern.studyDuration,
      isRunning: false,
      isBreak: false,
      alarmSound: state.alarmSound,
      patternId: state.patternId,
    })
    setShowCompletion(false)
    hasPlayedRef.current = false
  }

  const handleSetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const num = parseInt(value) || 0
    if (num >= 1 && num <= 10) {
      setInputSets(value)
    }
  }

  const handleAlarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      alarmSound: e.target.value as AlarmSound,
    }))
  }

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patternId = e.target.value
    const pattern = POMODORO_PATTERNS[patternId]
    setState((prev) => ({
      ...prev,
      patternId,
      timeLeft: pattern.studyDuration,
      isRunning: false,
      currentSet: 1,
    }))
    hasPlayedRef.current = false
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const isCompleted = state.currentSet > state.sets && state.timeLeft === 0

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-card">
        {/* パターン選択 */}
        <div className="pomodoro-section pomodoro-section--compact">
          <label className="pomodoro-label">ポモドーロパターン</label>
          <select
            value={state.patternId}
            onChange={handlePatternChange}
            disabled={state.isRunning}
            className="pomodoro-select"
          >
            {Object.entries(POMODORO_PATTERNS).map(([id, pattern]) => (
              <option key={id} value={id}>
                {pattern.name}
              </option>
            ))}
          </select>
        </div>

        {/* ステータスと進捗情報 */}
        <div className="pomodoro-status-bar">
          <div className="pomodoro-status-badge" style={{
            background: state.isBreak ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
            borderColor: state.isBreak ? '#10b981' : '#0ea5e9',
            color: state.isBreak ? '#10b981' : '#0ea5e9',
          }}>
            {state.isBreak ? '休憩中' : '学習中'}
          </div>
          <div className="pomodoro-progress-info">セット {state.currentSet}/{state.sets}</div>
        </div>

        {/* メインタイマー表示 - Modern Glassmorphism */}
        <div className="pomodoro-timer-modern" style={{
          borderColor: state.isBreak ? '#10b981' : '#0ea5e9',
        }}>
          <div className="pomodoro-timer-display">
            {formatTime(state.timeLeft).split(':').slice(1).join(':')}
          </div>
          <div className="pomodoro-timer-label">
            {state.isBreak ? '休憩時間' : '学習時間'}
          </div>
        </div>

        {/* 完了メッセージ */}
        {showCompletion && isCompleted && (
          <div className="pomodoro-completion-modern">
            🎉 全セット完了しました！お疲れ様でした！
          </div>
        )}

        {/* プリセット情報 */}
        <div className="pomodoro-preset-grid">
          <div className="preset-item">
            <span className="preset-label">学習時間</span>
            <span className="preset-value">{Math.floor(currentPattern.studyDuration / 60)}分</span>
          </div>
          <div className="preset-item">
            <span className="preset-label">休憩時間</span>
            <span className="preset-value">{Math.floor(currentPattern.breakDuration / 60)}分</span>
          </div>
        </div>

        {/* コントロール */}
        <div className="pomodoro-controls-modern">
          <button className="pomodoro-btn-modern pomodoro-btn-modern--primary" onClick={handleStart} disabled={state.isRunning}>
            開始
          </button>
          <button className="pomodoro-btn-modern pomodoro-btn-modern--secondary" onClick={handlePause} disabled={!state.isRunning}>
            一時停止
          </button>
          <button className="pomodoro-btn-modern pomodoro-btn-modern--reset" onClick={handleReset}>
            リセット
          </button>
        </div>

        {/* 設定セクション */}
        <div className="pomodoro-settings-modern">
          {/* セット数 */}
          <div className="pomodoro-setting-group">
            <label className="pomodoro-label">セット数</label>
            <input
              type="number"
              min="1"
              max="10"
              value={inputSets}
              onChange={handleSetChange}
              disabled={state.isRunning}
              className="pomodoro-input-modern"
            />
          </div>

          {/* アラーム音 */}
          <div className="pomodoro-setting-group">
            <label className="pomodoro-label">アラーム音</label>
            <select value={state.alarmSound} onChange={handleAlarmChange} className="pomodoro-select-modern">
              {ALARM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
