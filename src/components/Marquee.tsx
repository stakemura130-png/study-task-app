import { useEffect, useState } from 'react'
import type { MarqueeConfig } from '../types'

interface MarqueeProps {
  config: MarqueeConfig
}

export function Marquee({ config }: MarqueeProps) {
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0)

  // パターンを時間ベースで切り替え
  useEffect(() => {
    if (!config.patterns || config.patterns.length === 0) return

    const interval = setInterval(() => {
      setCurrentPatternIndex((prev) => (prev + 1) % config.patterns.length)
    }, config.switchIntervalMinutes * 60 * 1000)

    return () => clearInterval(interval)
  }, [config.patterns?.length, config.switchIntervalMinutes])

  if (config.patterns.length === 0) return null

  const currentPattern = config.patterns[currentPatternIndex]
  const messages = currentPattern.messages
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m)

  const marqueeText = messages.join('  •  ') + '  •  ' + messages.join('  •  ') + '  •  ' + messages.join('  •  ')

  const getBorderStyle = () => {
    if (currentPattern.borderStyle === 'dashed') {
      return `2px dashed ${currentPattern.borderColor}`
    }
    if (currentPattern.borderStyle === 'gradient') {
      return `2px solid ${currentPattern.borderColor}`
    }
    return `2px solid ${currentPattern.borderColor}`
  }

  const getGradientBackground = () => {
    if (currentPattern.borderStyle === 'gradient') {
      return `linear-gradient(90deg, ${currentPattern.bgColor}, rgba(99, 102, 241, 0.1))`
    }
    return currentPattern.bgColor
  }

  return (
    <div
      className="marquee"
      style={{
        background: getGradientBackground(),
        borderColor: currentPattern.borderColor,
        color: currentPattern.textColor,
      }}
    >
      <div className="marquee__text" style={{ animationDuration: `${config.speed}s` }}>
        {marqueeText}
      </div>
      {/* パターン数が2つ以上の場合、インジケーターを表示 */}
      {config.patterns.length > 1 && (
        <div className="marquee__indicators">
          {config.patterns.map((_, index) => (
            <span
              key={index}
              className={`marquee__dot${index === currentPatternIndex ? ' active' : ''}`}
            />
          ))}
        </div>
      )}
      <style>{`
        .marquee {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          border: ${getBorderStyle()};
          border-radius: 8px;
          padding: 0 12px;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
          position: relative;
        }

        /* iPad / タブレット用（1024px 以下） */
        @media (max-width: 1024px) {
          .marquee {
            width: 100%;
            height: 56px;
            font-size: 18px;
            margin: 0;
          }
        }

        .marquee__text {
          display: inline-block;
          padding-left: 0;
          animation: marquee linear infinite;
        }

        .marquee__indicators {
          display: flex;
          gap: 4px;
          margin-left: 8px;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        }

        .marquee__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.5;
          transition: opacity 0.3s;
        }

        /* iPad / タブレット用（1024px 以下） */
        @media (max-width: 1024px) {
          .marquee__dot {
            width: 8px;
            height: 8px;
          }
        }

        .marquee__dot.active {
          opacity: 1;
        }

        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  )
}
