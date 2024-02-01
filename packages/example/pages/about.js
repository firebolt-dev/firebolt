import { css } from 'galaxy'

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

export async function getPageData() {
  await delay(1000)
  return {
    title: 'About',
    meta: [
      { name: 'description', content: 'All about me' },
      { property: 'og:title', content: 'Title!' },
    ],
    props: {
      test: 'TEST!',
    },
    expire: 0,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
