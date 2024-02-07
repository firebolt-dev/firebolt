import { css } from 'firebolt'
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
  return (
    <div
      css={css`
        color: green;
      `}
    >
      Skeleton
    </div>
  )
}

export async function getMetadata() {
  await delay(2000)
  return {
    title: 'Skeleton',
    description: 'Skeleton desc!',
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
