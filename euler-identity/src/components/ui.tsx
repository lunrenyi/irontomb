import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'motion/react'
import type { ColorToken } from '../content'

/** 拼接 className，过滤掉 false / null */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

interface SectionProps {
  id: string
  children: ReactNode
  className?: string
}

/** 章节容器：统一锚点与留白 */
export function Section({ id, children, className }: SectionProps) {
  return (
    <section id={id} className={cx('relative scroll-mt-24', className)}>
      {children}
    </section>
  )
}

interface HeadingProps {
  kicker: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({ kicker, title, lead, align = 'left', className }: HeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cx(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <span className='flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.34em] text-muted'>
        <span className='h-px w-8 bg-vector/70' aria-hidden='true' />
        {kicker}
      </span>
      <h2 className='max-w-[22ch] font-display text-[clamp(1.75rem,4.6vw,3.1rem)] leading-[1.15] text-paper text-balance-cn'>
        {title}
      </h2>
      {lead ? <div className='max-w-[58ch] text-[15px] leading-relaxed text-muted sm:text-base'>{lead}</div> : null}
    </motion.div>
  )
}

/** 播放控制条：统一全站的播放控件视觉语言 */
export function PlaybackBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center gap-2 rounded-full border border-muted/15 bg-ink-900/70 px-2.5 py-2 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

const toneIdle: Record<ColorToken, string> = {
  vector: 'border-vector/40 text-vector hover:border-vector/80',
  imag: 'border-imag/40 text-imag hover:border-imag/80',
  node: 'border-node/40 text-node hover:border-node/80',
  paper: 'border-paper/25 text-paper/85 hover:border-paper/60',
}

const toneActive: Record<ColorToken, string> = {
  vector: 'bg-vector/15 border-vector/70 text-vector',
  imag: 'bg-imag/15 border-imag/70 text-imag',
  node: 'bg-node/15 border-node/70 text-node',
  paper: 'bg-paper/15 border-paper/60 text-paper',
}

interface ChipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: ColorToken
}

export function ChipButton({ active = false, tone = 'vector', className, children, ...rest }: ChipButtonProps) {
  return (
    <button
      type='button'
      {...rest}
      className={cx(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:text-[13px]',
        active ? toneActive[tone] : toneIdle[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

interface PlayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  playing: boolean
  playLabel?: string
  pauseLabel?: string
}

export function PlayButton({
  playing,
  playLabel = '播放',
  pauseLabel = '暂停',
  className,
  ...rest
}: PlayButtonProps) {
  return (
    <button
      type='button'
      aria-label={playing ? pauseLabel : playLabel}
      {...rest}
      className={cx(
        'flex items-center gap-2 rounded-full bg-paper px-4 py-1.5 text-[13px] font-semibold text-ink-950',
        'transition-transform duration-200 hover:scale-[1.03] active:scale-95',
        className,
      )}
    >
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

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function GhostButton({ children, className, ...rest }: GhostButtonProps) {
  return (
    <button
      type='button'
      {...rest}
      className={cx(
        'rounded-full border border-muted/25 px-3.5 py-1.5 text-[13px] text-muted',
        'transition-colors duration-200 hover:border-paper/50 hover:text-paper',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** 章节之间的「继续探索」入口 */
export function NextCue({ target, label }: { target: string; label: string }) {
  return (
    <motion.a
      href={'#' + target}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className='group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-vector'
    >
      <span className='h-px w-8 bg-muted/40 transition-all duration-300 group-hover:w-12 group-hover:bg-vector/60' />
      {label}
      <span aria-hidden='true' className='transition-transform duration-300 group-hover:translate-x-1'>
        ↓
      </span>
    </motion.a>
  )
}
