import StorekeeperOchreHero from './StorekeeperOchreHero'

/**
 * Full-bleed page wrapper: ochre hero + overlapping content shell (accountant pattern).
 */
export default function StorekeeperPageShell({
  eyebrow = 'Storekeeper Portal',
  titleLine,
  titleAccent = '',
  subtitle,
  icon: Icon,
  rightSlot,
  children,
  className = '',
  compact = false,
}) {
  if (compact) {
    return (
      <div
        className={`animate-in fade-in duration-500 bg-re-bg min-h-full pb-20 lg:pb-6 relative w-full px-3 sm:px-4 lg:px-6 pt-4 ${className}`}
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10 relative w-full ${className}`}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <StorekeeperOchreHero
        eyebrow={eyebrow}
        titleLine={titleLine}
        titleAccent={titleAccent}
        subtitle={subtitle}
        icon={Icon}
        rightSlot={rightSlot}
      />
      <div className="store-shell-standard">{children}</div>
    </div>
  )
}
