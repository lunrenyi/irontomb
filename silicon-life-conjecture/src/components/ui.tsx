import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface SectionProps {
  id: string
  children: ReactNode
  className?: string
}

export function Section({ id, children, className }: SectionProps) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  )
}

export type Tone = 'signal' | 'blue' | 'violet' | 'amber' | 'bio' | 'paper'

const idleTone: Record<Tone, string> = {
  signal: 'border-signal/40 text-signal hover:border-signal/80',
  blue: 'border-blue/40 text-blue hover:border-blue/80',
  violet: 'border-violet/40 text-violet hover:border-violet/80',
  amber: 'border-amber/40 text-amber hover:border-amber/80',
  bio: 'border-bio/40 text-bio hover:border-bio/80',
  paper: 'border-paper/25 text-paper/85 hover:border-paper/60',
}

const activeTone: Record<Tone, string> = {
  signal: 'bg-signal/15 border-signal/70 text-signal',
  blue: 'bg-blue/15 border-blue/70 text-blue',
  violet: 'bg-violet/15 border-violet/70 text-violet',
  amber: 'bg-amber/15 border-amber/70 text-amber',
  bio: 'bg-bio/15 border-bio/70 text-bio',
  paper: 'bg-paper/15 border-paper/60 text-paper',
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: Tone
}

export function Chip({ active = false, tone = 'signal', className, children, ...rest }: ChipProps) {
  return (
    <button
      type='button'
      {...rest}
      className={cx(
        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
        active ? activeTone[tone] : idleTone[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Ghost({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type='button' {...rest} className={cx('rounded-full border border-signal/20 px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-paper/50 hover:text-paper', className)}>
      {children}
    </button>
  )
}

export interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

/** 统一的滑块：带标签、单位与键盘支持 */
export function Slider({ id, label, value, min, max, step = 1, suffix = '', onChange }: SliderProps) {
  return (
    <div>
      <label htmlFor={id} className='flex items-baseline justify-between text-xs uppercase tracking-[0.2em] text-muted'>
        <span>{label}</span>
        <span className='font-mono text-sm normal-case tracking-normal text-paper'>
          {value}
          {suffix}
        </span>
      </label>
      <input id={id} type='range' className='lab-range mt-3 w-full' min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

/** 可展开的说明区域：科学限定都收在这里，不压在主画面上 */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className='group rounded-xl border border-signal/15 bg-ink-900/40'>
      <summary className='flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] text-muted transition-colors hover:text-paper'>
        <span aria-hidden='true' className='transition-transform group-open:rotate-90'>
          ›
        </span>
        {title}
      </summary>
      <div className='border-t border-signal/10 px-4 py-3 text-[13px] leading-relaxed text-muted'>{children}</div>
    </details>
  )
}
