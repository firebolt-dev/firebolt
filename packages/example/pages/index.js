import { css, Link } from 'galaxy'

export default function Home({ test }) {
  return (
    <div>
      <div
        css={css`
          color: black;
        `}
      >
        Home holy shit: {test}
      </div>
      {/* <div onClick={() => history.pushState({}, '', '/about')}>/about</div> */}
      <Link href='/about'>About</Link>
      <Link href='/skeleton'>Skeleton</Link>
    </div>
  )
}

export function Loading() {
  return <div>...</div>
}

export async function getMetadata({ params }) {
  return {
    title: 'Home',
    description: 'Home description from getMetadata()',
  }
}

// todo: rename -> getServerProps({ params })
export async function getPageData() {
  await delay(2000)
  return {
    title: 'Home',
    meta: [
      { name: 'description', content: 'Home description' },
      { property: 'og:title', content: 'Home OG title' },
    ],
    props: {
      test: 'TEST!',
    },
    expire: null,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
