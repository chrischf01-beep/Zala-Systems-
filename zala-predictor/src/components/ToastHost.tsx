import { useToastStore } from '../stores/toastStore';
import { AlertIcon, CheckIcon, CloseIcon, AboutIcon } from './svg/icons';

const variantStyle: Record<string, { border: string; icon: React.ReactNode }> = {
  success: { border: 'border-success/50', icon: <CheckIcon size={18} className="text-success" /> },
  error: { border: 'border-danger/50', icon: <AlertIcon size={18} className="text-danger" /> },
  warning: { border: 'border-tertiary/50', icon: <AlertIcon size={18} className="text-tertiary" /> },
  info: { border: 'border-primary/50', icon: <AboutIcon size={18} className="text-primary" /> },
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const s = variantStyle[t.variant] ?? variantStyle.info;
        return (
          <div
            key={t.id}
            className={`glass-strong pointer-events-auto flex items-start gap-3 border-l-2 p-3 animate-fadeUp ${s.border}`}
            role="status"
          >
            <span className="mt-0.5">{s.icon}</span>
            <p className="flex-1 text-sm text-text">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-muted transition-colors hover:text-text"
              aria-label="Dismiss"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastHost;
