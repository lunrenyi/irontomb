import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Section({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  )
}

export type Tone = 'cyan' | 'green' | 'violet' | 'amber' | 'coral'

const idle: Record<Tone, string> = {
  cyan: 'border-cyan/40 text-cyan hover:border-cyan/80',
  green: 'border-green/40 text-green hover:border-green/80',
  violet: 'border-violet/40 text-violet hover:border-violet/80',
  amber: 'border-amber/40 text-amber hover:border-amber/80',
  coral: 'border-coral/40 text-coral hover:border-coral/80',
}

const activeTone: Record<Tone, string> = {
  cyan: 'bg-cyan/15 border-cyan/70 text-cyan',
  green: 'bg-green/15 border-green/70 text-green',
  violet: 'bg-violet/15 border-violet/70 text-violet',
  amber: 'bg-amber/15 border-amber/70 text-amber',
  coral: 'bg-coral/15 border-coral/70 text-coral',
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: Tone
}

export function Chip({ active = false, tone = 'cyan', className, children, ...rest }: ChipProps) {
  return (
    <button
      type='button'
      {...rest}
      className={cx(
        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
        active ? activeTone[tone] : idle[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Ghost({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type='button'
      {...rest}
      className={cx(
        'rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-white/40 hover:text-paper',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** 可展开的说明区域：读法限定都收在这里，不压在主画面上 */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className='group rounded-xl border border-white/12 bg-white/[0.02]'>
      <summary className='flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] text-muted transition-colors hover:text-paper'>
        <span aria-hidden='true' className='transition-transform group-open:rotate-90'>
          ›
        </span>
        {title}
      </summary>
      <div className='border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-muted'>{children}</div>
    </details>
  )
}

/** 一行读数 */
const toneText: Record<Tone, string> = {
  cyan: 'text-cyan',
  green: 'text-green',
  violet: 'text-violet',
  amber: 'text-amber',
  coral: 'text-coral',
}

export function Stat({ label, value, tone = 'cyan' }: { label: string; value: string | number; tone?: Tone }) {
  return (
    <div className='border-l border-white/12 pl-3'>
      <div className='font-mono text-[10px] uppercase tracking-[0.2em] text-faint'>{label}</div>
      <div className={cx('mt-1 font-mono text-[15px]', toneText[tone])}>{value}</div>
    </div>
  )
}
