import { useEffect, useMemo, useState } from 'react'
import { animate, motion, motionValue } from 'motion/react'
import { UnitCircle } from './UnitCircle'
import { GhostButton, cx } from './ui'
import { Formula } from './Math'
import { QUIZ, type QuizDemo, type QuizQuestion } from '../content'
import { PI } from '../lib/math'

interface AnswerState {
  chosen: string | null
  solved: boolean
}

const INITIAL: AnswerState = { chosen: null, solved: false }

/** 场景 08 · 预测挑战 */
export function QuizSection() {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(QUIZ.map((question) => [question.id, INITIAL])),
  )

  const solvedCount = QUIZ.filter((question) => answers[question.id]?.solved).length
  const allSolved = solvedCount === QUIZ.length

  const choose = (question: QuizQuestion, optionId: string, correct: boolean) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? INITIAL
      const next = correct
        ? { chosen: optionId, solved: true }
        : // 答错：保留提示，但仍然允许继续尝试
          { chosen: current.solved ? current.chosen : optionId, solved: current.solved }
      return { ...prev, [question.id]: next }
    })
  }

  return (
    <div className='flex flex-col gap-8'>
      <div className='grid gap-5 lg:grid-cols-3'>
        {QUIZ.map((question) => (
          <QuestionCard key={question.id} question={question} answer={answers[question.id] ?? INITIAL} onChoose={choose} />
        ))}
      </div>

      <div className='flex flex-col items-center gap-4 pt-2'>
        <p className='text-sm text-muted'>
          已答对 {solvedCount} / {QUIZ.length} 题 · 答错可以重来，不影响你继续往下看
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <GhostButton
            onClick={() =>
              setAnswers(Object.fromEntries(QUIZ.map((question) => [question.id, INITIAL])))
            }
          >
            重做一遍
          </GhostButton>
          {allSolved ? (
            <motion.a
              href='#hero'
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className='inline-flex items-center gap-2 rounded-full bg-vector px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.03] active:scale-95'
            >
              重新体验整段旅程 ↑
            </motion.a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  answer,
  onChoose,
}: {
  question: QuizQuestion
  answer: AnswerState
  onChoose: (question: QuizQuestion, optionId: string, correct: boolean) => void
}) {
  const chosenOption = question.options.find((option) => option.id === answer.chosen)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className='glass-panel flex flex-col gap-4 rounded-2xl p-5'
    >
      <div className='flex items-start gap-3'>
        <span className='mt-0.5 font-mono text-xs text-node'>Q{question.index}</span>
        <div className='flex flex-col gap-2'>
          <p className='text-[15px] leading-relaxed text-paper'>{question.question}</p>
          {question.math ? <Formula tex={question.math} className='text-base text-vector' label={question.math} /> : null}
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {question.options.map((option) => {
          const isChosen = answer.chosen === option.id
          const reveal = isChosen
          const correctChosen = reveal && option.correct
          const wrongChosen = reveal && !option.correct && !answer.solved
          return (
            <button
              key={option.id}
              type='button'
              onClick={() => onChoose(question, option.id, option.correct)}
              disabled={answer.solved}
              className={cx(
                'flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-all duration-200',
                correctChosen
                  ? 'border-vector/70 bg-vector/12 text-vector'
                  : wrongChosen
                    ? 'border-node/50 bg-node/8 text-node'
                    : 'border-muted/18 text-paper hover:border-paper/40',
                answer.solved && !isChosen ? 'border-muted/10 text-faint' : '',
              )}
            >
              <Formula tex={option.tex} className='text-base' label={option.tex} />
              <span className='text-[11px] text-muted'>
                {correctChosen ? '答对了' : wrongChosen ? '再想想' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {chosenOption && !chosenOption.correct ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-xl border border-node/25 bg-node/[0.07] px-4 py-3 text-[13px] leading-relaxed text-muted'
        >
          {chosenOption.hint}
        </motion.p>
      ) : null}

      {answer.solved ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='flex flex-col gap-3'>
          <p className='rounded-xl border border-vector/25 bg-vector/[0.07] px-4 py-3 text-[13px] leading-relaxed text-muted'>
            {question.explanation}
          </p>
          <QuizDemo kind={question.demo} />
        </motion.div>
      ) : null}
    </motion.div>
  )
}

/** 答对之后播放的小动画：把刚才的结论再演一遍 */
function QuizDemo({ kind }: { kind: QuizDemo }) {
  if (kind === 'cancel') return <CancelDemo />
  return <CircleDemo target={kind === 'half-turn' ? PI : PI} halfTurn={kind === 'half-turn'} />
}

function CircleDemo({ target, halfTurn }: { target: number; halfTurn: boolean }) {
  const theta = useMemo(() => motionValue(0), [])
  const [running, setRunning] = useState(true)

  useEffect(() => {
    const controls = animate(theta, target, { duration: halfTurn ? 1.5 : 1.2, ease: [0.16, 1, 0.3, 1] })
    controls.then(() => setRunning(false))
    return () => controls.stop()
  }, [halfTurn, target, theta])

  return (
    <div className='flex items-center gap-3'>
      <div className='h-24 w-24 shrink-0'>
        <UnitCircle theta={theta} showSweep showProjections={false} showAngleText={false} className='h-full w-full' />
      </div>
      <p className='text-[13px] leading-relaxed text-muted'>
        {halfTurn
          ? '从 (1, 0) 转 π 弧度，也就是半圈，点落在 (-1, 0)：正好是 -1。'
          : '转到 θ = π 时，点落在实轴上，竖直分量为 0，所以 sin π = 0。'}
      </p>
      {!running ? <span className='sr-only'>动画播放完毕</span> : null}
    </div>
  )
}

function CancelDemo() {
  const [phase, setPhase] = useState<'show' | 'move' | 'zero'>('show')

  useEffect(() => {
    const first = window.setTimeout(() => setPhase('move'), 500)
    const second = window.setTimeout(() => setPhase('zero'), 1700)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [])

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative h-14'>
        <motion.span
          className='absolute left-[18%] top-1/2 block h-[3px] w-[26%] rounded-full bg-vector'
          initial={{ x: '0%' }}
          animate={{ x: phase === 'show' ? '0%' : '123%' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className='absolute left-[56%] top-1/2 block h-[3px] w-[26%] rounded-full bg-imag'
          initial={{ x: '0%' }}
          animate={{ x: phase === 'show' ? '0%' : '-23%' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className='absolute left-[18%] top-0.5 -translate-x-1/2 text-sm text-vector'
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'show' ? 1 : 0 }}
        >
          -1
        </motion.span>
        <motion.span
          className='absolute left-[82%] top-0.5 -translate-x-1/2 text-sm text-imag'
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'show' ? 1 : 0 }}
        >
          +1
        </motion.span>
        <motion.span
          className='absolute bottom-0 left-1/2 -translate-x-1/2 font-display text-2xl text-result'
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: phase === 'zero' ? 1 : 0, scale: phase === 'zero' ? 1 : 0.6 }}
          transition={{ duration: 0.5 }}
        >
          0
        </motion.span>
      </div>
      <p className='text-[13px] leading-relaxed text-muted'>-1 和 +1 大小相同、方向相反，相加正好抵消，只剩 0。</p>
    </div>
  )
}

export default QuizSection
