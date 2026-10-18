/**
 * 影片寻址总线。
 * 页面上的任何部分都可以请求播放器跳到某一帧，而不必把播放器状态透传到 App。
 */
type SeekListener = (frame: number) => void

const listeners = new Set<SeekListener>()

export function onFilmSeek(listener: SeekListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function seekFilm(frame: number): void {
  listeners.forEach((listener) => listener(frame))
}
