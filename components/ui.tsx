// shadcn/ui-style primitives (same classes, no CLI / Radix needed for a 5-field form).
import type { ComponentProps } from 'react';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const field =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring';

export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input className={cx(field, className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<'select'>) => (
  <div className="relative">
    <select className={cx(field, 'appearance-none pr-9', className)} {...p} />
    <svg className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
  </div>
);
export const Label = ({ className, ...p }: ComponentProps<'label'>) => <label className={cx('text-sm font-semibold', className)} {...p} />;

export function Button({ variant = 'default', className, ...p }: ComponentProps<'button'> & { variant?: 'default' | 'outline' }) {
  return (
    <button
      className={cx(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer',
        variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-input bg-background hover:bg-muted',
        className,
      )}
      {...p}
    />
  );
}
