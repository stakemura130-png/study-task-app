import { useState } from 'react'

interface CalendarEvent {
  id: string
  date: string
  title: string
  description: string
}

interface CalendarProps {
  // calendar events can be stored in state or Firebase
}

export function Calendar({ }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const getDays = () => {
    const days = []
    const current = new Date(startDate)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isCurrentMonth = (date: Date) => date.getMonth() === month

  const addEvent = () => {
    if (!selectedDate || !eventTitle.trim()) return
    const newEvent: CalendarEvent = {
      id: `event_${Date.now()}`,
      date: selectedDate,
      title: eventTitle,
      description: eventDescription,
    }
    setEvents([...events, newEvent])
    setEventTitle('')
    setEventDescription('')
    setShowEventForm(false)
  }

  const deleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const days = getDays()
  const dayEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : []

  return (
    <div className="calendar-container" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      {/* カレンダー */}
      <div className="calendar-panel" style={{ background: 'var(--panel)', borderRadius: '8px', padding: '20px' }}>
        {/* 月ナビゲーション */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ◀
          </button>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {year}年 {monthNames[month]}
          </h2>
          <button
            onClick={nextMonth}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ▶
          </button>
        </div>

        {/* 曜日ラベル */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {dayNames.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '12px',
                padding: '8px',
                color: day === '日' ? '#ef4444' : day === '土' ? '#3b82f6' : 'var(--text)',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map((day, i) => {
            const dateStr = formatDate(day)
            const dayEvent = events.filter((e) => e.date === dateStr)
            const isSelected = dateStr === selectedDate
            const isToday = formatDate(new Date()) === dateStr

            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedDate(dateStr)
                  setShowEventForm(false)
                }}
                style={{
                  aspectRatio: '1',
                  border: isSelected ? '2px solid var(--accent)' : isToday ? '2px solid #ef4444' : '1px solid var(--border)',
                  borderRadius: '6px',
                  background: isCurrentMonth(day) ? 'var(--surface)' : 'transparent',
                  color: isCurrentMonth(day) ? 'var(--text)' : 'var(--text-soft)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isCurrentMonth(day) ? 600 : 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <div>{day.getDate()}</div>
                {dayEvent.length > 0 && (
                  <div style={{ fontSize: '8px', marginTop: '2px', color: 'var(--accent)' }}>
                    •{dayEvent.length}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* イベント編集パネル */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '20px' }}>
        {/* 選択日情報 */}
        {selectedDate && (
          <div className="panel" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
              {selectedDate.split('-')[0]}年 {selectedDate.split('-')[1]}月 {parseInt(selectedDate.split('-')[2])}日
            </h3>

            {!showEventForm ? (
              <button
                className="btn btn--primary"
                onClick={() => setShowEventForm(true)}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                ＋ イベント追加
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="イベント名"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="説明（オプション）"
                  style={{
                    padding: '6px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    minHeight: '60px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn--primary"
                    onClick={addEvent}
                    style={{ flex: 1, padding: '6px' }}
                  >
                    追加
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setShowEventForm(false)
                      setEventTitle('')
                      setEventDescription('')
                    }}
                    style={{ flex: 1, padding: '6px' }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* イベント一覧 */}
            <div style={{ display: 'grid', gap: '8px' }}>
              {dayEvents.length === 0 ? (
                <p style={{ color: 'var(--text-soft)', fontSize: '12px', margin: 0 }}>イベントなし</p>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      padding: '8px',
                      background: 'var(--accent)',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{event.title}</div>
                    {event.description && (
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '6px' }}>{event.description}</div>
                    )}
                    <button
                      onClick={() => deleteEvent(event.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '2px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
