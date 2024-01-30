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
      <Link href='/shell'>Shell</Link>
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
    expire: null,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
