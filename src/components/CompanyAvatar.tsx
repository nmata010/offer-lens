interface CompanyAvatarProps {
  initials: string
  color: string
  size?: number
}

export function CompanyAvatar({ initials, color, size = 44 }: CompanyAvatarProps) {
  return (
    <div
      className="rounded-lg flex items-center justify-center font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
      }}
    >
      {initials.slice(0, 2)}
    </div>
  )
}
