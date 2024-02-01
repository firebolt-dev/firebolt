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

export async function getPageData() {
  // await delay(1000)
  return {
    title: 'Home',
    meta: [
      { name: 'description', content: 'I am description!' },
      { property: 'og:title', content: 'Title!' },
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
