import { useState } from 'react'

interface LoginScreenProps {
  onAuthenticate: () => void
}

export function LoginScreen({ onAuthenticate }: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const PASSWORD = 'take0130'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === PASSWORD) {
      onAuthenticate()
      setPassword('')
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">📚</div>
        <h1 className="login-title">学習タスク管理</h1>
        <p className="login-subtitle">司法試験・行政書士試験対策</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              autoFocus
            />
            {error && <div className="login-error">パスワードが正しくありません</div>}
          </div>

          <button type="submit" className="login-btn">
            ログイン
          </button>
        </form>

        <p className="login-hint">このアプリは個人用です。パスワードで保護されています。</p>
      </div>
    </div>
  )
}
