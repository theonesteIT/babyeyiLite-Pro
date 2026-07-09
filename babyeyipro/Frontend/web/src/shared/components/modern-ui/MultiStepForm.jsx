import { useState } from 'react';
import { ChevronRight, Headphones } from 'lucide-react';
import { BtnPrimary, BtnSecondary } from './formFields';
import { MODERN_UI } from './modernUiTheme';

function StepperBar({ steps, currentIndex, onStepClick, allowJump }) {
  return (
    <div className="flex items-center border-b border-black/[0.06] bg-white overflow-x-auto">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const clickable = allowJump && index <= currentIndex;

        return (
          <button
            key={step.id ?? index}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick?.(index)}
            className={`relative flex-1 min-w-[140px] px-4 py-4 text-left transition-colors ${
              clickable ? 'cursor-pointer hover:bg-slate-50/80' : 'cursor-default'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold border-2 transition-colors ${
                  isActive
                    ? 'bg-[#FF8C00] border-[#FF8C00] text-white'
                    : isDone
                      ? 'bg-[#FF8C00]/10 border-[#FF8C00] text-[#FF8C00]'
                      : 'bg-white border-black/15 text-[#000435]/40'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-sm font-semibold truncate ${
                  isActive ? 'text-[#000435]' : 'text-[#000435]/50'
                }`}
              >
                {step.title}
              </span>
            </div>
            {isActive ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8C00]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function StepsSummary({ steps, currentIndex }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#000435]/45">
        Steps Summary
      </h3>
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li
              key={step.id ?? index}
              className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isActive ? 'bg-[#FF8C00]/8 border border-[#FF8C00]/20' : ''
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-[#FF8C00] text-white'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-[#000435]' : 'text-[#000435]/70'}`}>
                  {step.title}
                </p>
                {step.description ? (
                  <p className="text-xs text-[#000435]/45 mt-0.5">{step.description}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-black/[0.06] bg-slate-50/80 p-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FF8C00]/10 flex items-center justify-center text-[#FF8C00] shrink-0">
            <Headphones size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#000435]">Need Help?</p>
            <p className="text-xs text-[#000435]/50 mt-0.5">Contact support if you get stuck.</p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[#FF8C00] hover:underline"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Multi-step form wizard — horizontal stepper, step content, optional summary sidebar.
 *
 * @example
 * <MultiStepForm
 *   title="Add New Student"
 *   steps={[
 *     { id: 'basic', title: 'Basic Information', description: 'Student personal info', content: <Step1 /> },
 *     { id: 'academic', title: 'Academic Info', content: <Step2 /> },
 *   ]}
 *   onComplete={handleSave}
 *   onCancel={handleCancel}
 * />
 */
export default function MultiStepForm({
  title,
  subtitle,
  steps = [],
  initialStep = 0,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  onCancel,
  onNext,
  onBack,
  validateStep,
  showSummary = true,
  allowJumpToCompleted = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false,
  className = '',
}) {
  const [internalStep, setInternalStep] = useState(initialStep);
  const currentIndex = controlledStep ?? internalStep;
  const setStep = (index) => {
    onStepChange?.(index);
    if (controlledStep === undefined) setInternalStep(index);
  };

  const step = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const goNext = async () => {
    if (validateStep) {
      const ok = await validateStep(currentIndex, step);
      if (!ok) return;
    }
    if (onNext) {
      const cont = await onNext(currentIndex, step);
      if (cont === false) return;
    }
    if (isLast) {
      onComplete?.();
      return;
    }
    setStep(currentIndex + 1);
  };

  const goBack = () => {
    if (onBack) onBack(currentIndex, step);
    if (!isFirst) setStep(currentIndex - 1);
  };

  if (!step) return null;

  return (
    <div
      className={`rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden ${className}`}
      style={{ fontFamily: MODERN_UI.font }}
    >
      {(title || subtitle) && (
        <div className="px-6 pt-6 pb-2">
          {title ? <h2 className="text-lg font-bold text-[#000435]">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-sm text-[#000435]/55">{subtitle}</p> : null}
        </div>
      )}

      <StepperBar
        steps={steps}
        currentIndex={currentIndex}
        onStepClick={setStep}
        allowJump={allowJumpToCompleted}
      />

      <div className={`grid gap-6 ${showSummary ? 'lg:grid-cols-[1fr_280px]' : ''}`}>
        <div className="px-6 py-6 min-w-0">
          {step.content}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-black/[0.04]">
            <div>
              {onCancel ? (
                <BtnSecondary type="button" onClick={onCancel} disabled={loading}>
                  {cancelLabel}
                </BtnSecondary>
              ) : null}
            </div>
            <div className="flex gap-3 justify-end">
              {!isFirst ? (
                <BtnSecondary type="button" onClick={goBack} disabled={loading}>
                  {backLabel}
                </BtnSecondary>
              ) : null}
              <BtnPrimary type="button" onClick={goNext} disabled={loading}>
                {loading ? 'Please wait…' : isLast ? submitLabel : (
                  <span className="inline-flex items-center gap-1">
                    {nextLabel} <ChevronRight size={16} />
                  </span>
                )}
              </BtnPrimary>
            </div>
          </div>
        </div>

        {showSummary ? (
          <div className="hidden lg:block px-6 py-6 border-l border-black/[0.04] bg-slate-50/40">
            <StepsSummary steps={steps} currentIndex={currentIndex} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
