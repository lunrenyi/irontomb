/** 影片寻址总线：页面上任何部分都能请求播放器跳到某一帧。 */
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
