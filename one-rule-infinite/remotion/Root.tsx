import 'katex/dist/katex.min.css'
import { Composition, useCurrentFrame } from 'remotion'
import { GrowthFilm } from '../src/story/Film'
import { FPS, STAGE_H, STAGE_W, TOTAL_FRAMES } from '../src/story/timeline'

/** 视频入口：只负责把「当前帧」交给影片 */
function FilmComposition() {
  const frame = useCurrentFrame()
  return <GrowthFilm frame={frame} width={STAGE_W} height={STAGE_H} />
}

export const RemotionRoot = () => {
  return (
    <Composition
      id='Growth'
      component={FilmComposition}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={STAGE_W}
      height={STAGE_H}
    />
  )
}
