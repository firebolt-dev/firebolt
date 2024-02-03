import { css } from 'galaxy'

export default function Page({ serverMsg }) {
  return (
    <div
      css={css`
        color: blue;
      `}
    >
      Skeleton Page
    </div>
  )
}

export function Loading() {
  return <div>Skeleton</div>
}

export async function getPageData() {
  await delay(3000)
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
