import { css, Link } from 'galaxy'

export default function Home({ test }) {
  return (
    <div>
      <div
        css={css`
          color: red;
        `}
      >
        Home holy shit: {test}
      </div>
      <Link href='/about'>About</Link>
    </div>
  )
}

export async function getMetadata() {
  // await delay(1000)
  return {
    title: 'Title!',
    description: 'Description!',
    // meta: [
    //   { name: 'description', content: 'I am a description!' },
    //   { property: 'og:title', content: 'Title!' },
    // ],
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
