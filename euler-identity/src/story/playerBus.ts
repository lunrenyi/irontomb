/**
 * 影片寻址总线。
 *
 * 页面上的任何部分（例如「五个常数」里的 e）都可以请求播放器跳到某个章节，
 * 而不必把播放器状态一路透传到 App。一个极小的订阅表就够了。
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
