import { css } from 'galaxy'

export default function Page({ serverMsg }) {
  return (
    <div
      css={css`
        color: blue;
      `}
    >
      Real page! ({serverMsg || ''})
    </div>
  )
}

export function Loading() {
  return (
    <div
      css={css`
        color: red;
      `}
    >
      Skeleton
    </div>
  )
}

export async function getPageData() {
  await delay(1000)
  return {
    title: 'Skeleton',
    meta: [{ name: 'description', content: 'Skeleton' }],
    props: {
      serverMsg: 'BOOP',
    },
    expire: 2,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
