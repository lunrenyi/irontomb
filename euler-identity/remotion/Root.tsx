import 'katex/dist/katex.min.css'
import { Composition } from 'remotion'
import { useCurrentFrame } from 'remotion'
import { EulerFilm } from '../src/story/Film'
import { FPS, STAGE_H, STAGE_W, TOTAL_FRAMES } from '../src/story/timeline'

/**
 * 视频入口：只负责把「当前帧」交给影片。
 * 影片本身不含任何 Remotion 依赖，所以网站与视频用的是同一套组件。
 */
function FilmComposition() {
  const frame = useCurrentFrame()
  return <EulerFilm frame={frame} width={STAGE_W} height={STAGE_H} />
}

export const RemotionRoot = () => {
  return (
    <Composition
      id='EulerIdentity'
      component={FilmComposition}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={STAGE_W}
      height={STAGE_H}
    />
  )
}
