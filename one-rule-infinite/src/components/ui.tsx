import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface SectionProps {
  id: string
  children: ReactNode
  className?: string
}

/** 一个章节：语义化 section + 锚点 */
export function Section({ id, children, className }: SectionProps) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  )
}

export type Tone = 'shoot' | 'leaf' | 'bud' | 'water' | 'paper'

const idleTone: Record<Tone, string> = {
  shoot: 'border-shoot/40 text-shoot hover:border-shoot/80',
  leaf: 'border-leaf/40 text-leaf hover:border-leaf/80',
  bud: 'border-bud/40 text-bud hover:border-bud/80',
  water: 'border-water/40 text-water hover:border-water/80',
  paper: 'border-paper/25 text-paper/85 hover:border-paper/60',
}

const activeTone: Record<Tone, string> = {
  shoot: 'bg-shoot/15 border-shoot/70 text-shoot',
  leaf: 'bg-leaf/15 border-leaf/70 text-leaf',
  bud: 'bg-bud/15 border-bud/70 text-bud',
  water: 'bg-water/15 border-water/70 text-water',
  paper: 'bg-paper/15 border-paper/60 text-paper',
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: Tone
}

export function Chip({ active = false, tone = 'shoot', className, children, ...rest }: ChipProps) {
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

export interface GhostProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function Ghost({ children, className, ...rest }: GhostProps) {
  return (
    <button type='button' {...rest} className={cx('rounded-full border border-moss/25 px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-paper/50 hover:text-paper', className)}>
      {children}
    </button>
  )
}

export interface PlayProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  playing: boolean
  playLabel?: string
  pauseLabel?: string
}

export function PlayButton({ playing, playLabel = '播放', pauseLabel = '暂停', className, ...rest }: PlayProps) {
  return (
    <button type='button' aria-label={playing ? pauseLabel : playLabel} {...rest} className={cx('flex items-center gap-2 rounded-full bg-paper px-4 py-1.5 text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95', className)}>
      <span aria-hidden='true' className='flex h-3 w-3 items-center justify-center'>
        {playing ? (
          <span className='flex gap-[3px]'>
            <span className='h-3 w-[3px] rounded-full bg-ink-950' />
            <span className='h-3 w-[3px] rounded-full bg-ink-950' />
          </span>
        ) : (
          <span className='ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-ink-950' />
        )}
      </span>
      {playing ? pauseLabel : playLabel}
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
      <input
        id={id}
        type='range'
        className='growth-range mt-3 w-full'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
