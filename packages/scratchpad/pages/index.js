import { css, Link } from 'firebolt'

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
      <Link to='/about'>About</Link>
      <Link to='/skeleton'>Skeleton</Link>
    </div>
  )
}

export function Loading() {
  return <div>...</div>
}

// todo: rename -> getServerProps({ params })
export async function getMetadata() {
  await delay(1000)
  return {
    title: 'Home',
    description: 'Home description',
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
