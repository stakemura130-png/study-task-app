export function Marquee() {
  const messages = [
    '💪 頑張れ！',
    '🎯 目標達成に向けて',
    '✨ 絶対合格！',
    '🔥 全力で応援！',
    '📚 今が勝負',
    '⚡ 走り抜けろ！',
    '🏆 栄光を目指して',
    '💡 知識は力',
  ]

  const marqueeText = messages.join('  •  ') + '  •  ' + messages.join('  •  ')

  return (
    <div className="marquee">
      <div className="marquee__text">{marqueeText}</div>
      <style>{`
        .marquee {
          overflow: hidden;
          white-space: nowrap;
          flex: 1;
          height: 40px;
          display: flex;
          align-items: center;
          margin: 0 24px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-soft);
        }

        .marquee__text {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 20s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
