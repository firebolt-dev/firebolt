import { css } from 'firebolt'
import { useId } from 'react'

export default function About() {
  return (
    <div
      css={css`
        color: green;
      `}
    >
      About
    </div>
  )
}

// export function Loading() {
//   return <div>About loaidng...</div>
// }

export async function getMetadata() {
  await delay(2000)
  return {
    title: 'About',
    description: 'About description',
    props: {
      test: 'TEST!',
    },
    expire: 2,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
