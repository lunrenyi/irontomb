/** 页面底色：固定的空间层，只负责空间感，不参与叙事 */
export function Backdrop() {
  return (
    <>
      <div className='bg-field' aria-hidden='true' />
      <div className='bg-grid' aria-hidden='true' />
    </>
  )
}
