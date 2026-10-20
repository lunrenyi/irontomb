/** 每一幕都收到的同一组参数。 */
export interface SceneProps {
  /** 幕内帧号 */
  frame: number
  /** 当前拍的下标 */
  beat: number
  /** 当前拍的槽位（场景用它决定画什么） */
  slot: string
  /** 当前拍内的进度 0..1 */
  progress: number
  /** 整幕的进度 0..1 */
  sceneProgress: number
  /** 当前这一拍有多少帧 —— 场景用它做「这一拍内演完」的动画 */
  beatDuration: number
}
