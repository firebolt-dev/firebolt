import { css } from 'galaxy'
import { useState } from 'react'

export default function Page({ serverMsg }) {
  const [foo, setFoo] = useState()
  return (
    <div
      css={css`
        color: ${foo ? 'red' : 'blue'};
      `}
      onClick={() => setFoo(!foo)}
    >
      Skeleton Page ({serverMsg})
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
