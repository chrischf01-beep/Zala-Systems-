import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { CheckIcon, ChevronIcon, CloseIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../svg/icons';

/* ------------------------------- Button ------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantCls: Record<Variant, string> = {
  primary:
    'bg-primary text-[#04121a] hover:bg-primaryDark shadow-glow disabled:shadow-none font-semibold',
  secondary:
    'bg-secondary text-[#1a0410] hover:brightness-110 shadow-glowPink disabled:shadow-none font-semibold',
  ghost: 'bg-transparent text-text border border-border hover:border-primary hover:text-primary',
  danger: 'bg-danger text-[#1a0409] hover:brightness-110 font-semibold',
};

const sizeCls: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
  lg: 'text-base px-6 py-3 gap-2.5 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <SpinnerIcon size={size === 'sm' ? 14 : 18} /> : icon}
      {children}
    </button>
  );
}

/* -------------------------------- Card -------------------------------- */

export function Card({
  children,
  className = '',
  strong = false,
  ...rest
}: { children: ReactNode; className?: string; strong?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* -------------------------------- Input ------------------------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  revealPassword?: boolean;
  icon?: ReactNode;
}

export function Input({
  label,
  error,
  helper,
  revealPassword,
  icon,
  className = '',
  id,
  ...rest
}: InputProps) {
  const [show, setShow] = useState(false);
  const autoId = useRef(id ?? `in_${Math.random().toString(36).slice(2, 8)}`);
  const inputId = autoId.current;
  const describedBy = error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          type={revealPassword ? (show ? 'text' : 'password') : rest.type}
          className={`w-full rounded-xl border bg-surface/70 px-3.5 py-2.5 text-sm text-text placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none ${
            icon ? 'pl-10' : ''
          } ${revealPassword ? 'pr-10' : ''} ${
            error ? 'border-danger' : 'border-border'
          } ${className}`}
          {...rest}
        />
        {revealPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-err`} className="mt-1.5 flex items-center gap-1 text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${inputId}-help`} className="mt-1.5 text-xs text-muted">
          {helper}
        </p>
      )}
    </div>
  );
}

/* -------------------------------- Toggle ------------------------------ */

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-primary bg-primary/30' : 'border-border bg-surface2'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
          checked ? 'translate-x-6 bg-primary' : 'translate-x-1 bg-muted'
        }`}
      />
    </button>
  );
}

/* ------------------------------- Skeleton ----------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface2 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

/* ------------------------------ Dropdown ------------------------------ */

interface DropdownItem {
  value: string;
  label: string;
}

interface DropdownProps {
  items: DropdownItem[];
  value: string;
  onChange: (v: string) => void;
  trigger?: ReactNode;
  align?: 'left' | 'right';
  ariaLabel?: string;
}

export function Dropdown({ items, value, onChange, trigger, align = 'left', ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const current = items.find((i) => i.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((o) => !o);
          setActive(Math.max(0, items.findIndex((i) => i.value === value)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-3.5 py-2 text-sm text-text transition-colors hover:border-primary"
      >
        {trigger ?? <span>{current?.label ?? value}</span>}
        <ChevronIcon size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="glass-strong absolute z-40 mt-2 min-w-[160px] overflow-hidden p-1 animate-fadeUp"
          style={align === 'right' ? { right: 0 } : { left: 0 }}
        >
          {items.map((item, idx) => (
            <li key={item.value} role="option" aria-selected={item.value === value}>
              <button
                type="button"
                tabIndex={0}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange(item.value);
                    setOpen(false);
                  }
                  if (e.key === 'ArrowDown') setActive((a) => (a + 1) % items.length);
                  if (e.key === 'ArrowUp') setActive((a) => (a - 1 + items.length) % items.length);
                  if (e.key === 'Escape') setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active === idx ? 'bg-primary/15 text-primary' : 'text-text hover:bg-surface2'
                }`}
              >
                {item.label}
                {item.value === value && <CheckIcon size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Modal ------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({ open, onClose, title, children, footer, closeOnBackdrop = true }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const f = focusables();
        if (f.length === 0) return;
        const idx = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx - 1 + f.length) % f.length : (idx + 1) % f.length;
        f[next].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div ref={ref} className="glass-strong relative z-10 w-full max-w-md p-6 animate-fadeUp">
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-danger"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="text-sm text-muted">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------------------- Tabs -------------------------------- */

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div role="tablist" className="relative flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={`relative px-4 py-2 text-sm transition-colors ${
            t.id === active ? 'text-primary' : 'text-muted hover:text-text'
          }`}
        >
          {t.label}
          {t.id === active && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Pagination ---------------------------- */

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-primary disabled:opacity-40"
      >
        <ChevronIcon size={16} className="rotate-90" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-[36px] rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              p === page
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-text hover:border-primary'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-primary disabled:opacity-40"
      >
        <ChevronIcon size={16} className="-rotate-90" />
      </button>
    </nav>
  );
}

/* ------------------------------- Tooltip ------------------------------ */

const TipCtx = createContext(false);
export function useIsTouch() {
  return useContext(TipCtx);
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);
  return (
    <TipCtx.Provider value={show}>
      <span
        className="relative inline-flex"
        onMouseEnter={() => {
          timer.current = window.setTimeout(() => setShow(true), 200);
        }}
        onMouseLeave={() => {
          if (timer.current) clearTimeout(timer.current);
          setShow(false);
        }}
      >
        {children}
        {show && (
          <span className="glass-strong pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs text-text">
            {text}
            <svg className="absolute left-1/2 top-full -translate-x-1/2" width="10" height="6" aria-hidden="true">
              <path d="M0 0h10L5 6z" fill="#131A2E" />
            </svg>
          </span>
        )}
      </span>
    </TipCtx.Provider>
  );
}
