import type { MarqueeConfig } from '../types'

interface MarqueeProps {
  config: MarqueeConfig
}

export function Marquee({ config }: MarqueeProps) {
  const messages = config.messages
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m)

  const marqueeText = messages.join('  •  ') + '  •  ' + messages.join('  •  ')

  const getBorderStyle = () => {
    if (config.borderStyle === 'dashed') {
      return `2px dashed ${config.borderColor}`
    }
    if (config.borderStyle === 'gradient') {
      return `2px solid ${config.borderColor}`
    }
    return `2px solid ${config.borderColor}`
  }

  const getGradientBackground = () => {
    if (config.borderStyle === 'gradient') {
      return `linear-gradient(90deg, ${config.bgColor}, rgba(99, 102, 241, 0.1))`
    }
    return config.bgColor
  }

  return (
    <div
      className="marquee"
      style={{
        background: getGradientBackground(),
        borderColor: config.borderColor,
        color: config.textColor,
      }}
    >
      <div className="marquee__text" style={{ animationDuration: `${config.speed}s` }}>
        {marqueeText}
      </div>
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
          border: ${getBorderStyle()};
          border-radius: 8px;
          padding: 0 16px;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
        }

        .marquee__text {
          display: inline-block;
          padding-left: 100%;
          animation: marquee linear infinite;
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
