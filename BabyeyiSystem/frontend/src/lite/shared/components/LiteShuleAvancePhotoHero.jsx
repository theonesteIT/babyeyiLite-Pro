import LiteOrangePageHero from './LiteOrangePageHero';

/**
 * Shule Avance page hero — amber band (same as Ticha Deals).
 * Kept under this name for back-compat with existing imports.
 */
export default function LiteShuleAvancePhotoHero({
  title = 'Shule Avance',
  subtitle = 'Manage service requests, repayment flow, and request history.',
  badgeLabel = 'Staff benefits · Babyeyi Lite',
  onRefresh,
  refreshing = false,
  ...props
}) {
  return (
    <LiteOrangePageHero
      title={title}
      subtitle={subtitle}
      badgeLabel={badgeLabel}
      onRefresh={onRefresh}
      refreshing={refreshing}
      {...props}
    />
  );
}
