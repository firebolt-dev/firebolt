import { css } from 'firebolt'

export default function About() {
  // throw new Error('foo-bar')
  // console.log(foo.bar)
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
//   return <div>About loading...</div>
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
