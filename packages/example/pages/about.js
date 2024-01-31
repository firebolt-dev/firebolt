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

// export function Shell() {
//   return <div>About loaidng...</div>
// }

export async function getMetadata() {
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
    // data expiration
    // - when not set, clients will only fetch metadata for each page once and re-use old data when navigating back to it, forever (unless hard refresh)
    // - when set to 0, metadata immediately expires so clients will always re-fetch metadata when coming back to the page
    // - when set to >0, metadata will be cached for X seconds, after that it will be re-fetched and cached again
    expire: 0,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
