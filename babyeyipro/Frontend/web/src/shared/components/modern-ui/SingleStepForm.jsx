import { BtnPrimary, BtnSecondary } from './formFields';
import { MODERN_UI } from './modernUiTheme';

/**
 * Single-step form shell — card layout with title, grid body, footer actions.
 *
 * @example
 * <SingleStepForm
 *   title="Add New Employee"
 *   subtitle="Fill in the employee details below."
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 *   submitLabel="Save Employee"
 * >
 *   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *     <FormField label="Full Name" required>...</FormField>
 *   </div>
 * </SingleStepForm>
 */
export default function SingleStepForm({
  title,
  subtitle,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  footer,
  className = '',
  bodyClassName = '',
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden ${className}`}
      style={{ fontFamily: MODERN_UI.font }}
    >
      {(title || subtitle) && (
        <div className="px-6 pt-6 pb-4 border-b border-black/[0.04]">
          {title ? (
            <h2 className="text-lg font-bold text-[#000435] tracking-tight">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-sm text-[#000435]/55">{subtitle}</p>
          ) : null}
        </div>
      )}

      <div className={`px-6 py-6 ${bodyClassName}`}>{children}</div>

      <div className="px-6 py-4 border-t border-black/[0.04] bg-slate-50/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
        {footer ?? (
          <>
            {onCancel ? (
              <BtnSecondary type="button" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </BtnSecondary>
            ) : null}
            {onSubmit ? (
              <BtnPrimary type="submit" disabled={loading}>
                {loading ? 'Saving…' : submitLabel}
              </BtnPrimary>
            ) : null}
          </>
        )}
      </div>
    </form>
  );
}
