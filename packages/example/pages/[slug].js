import { Link, css, useLocation } from 'galaxy'

export default function Sluggy() {
  const location = useLocation()
  // console.log('loc', location)
  // console.log('par', location.params)
  return (
    <div
      css={css`
        color: green;
      `}
    >
      <div>Slug: {location.params.slug}</div>
      <Link to='/foobies'>FOOBIES</Link>
    </div>
  )
}

export async function getMetadata() {
  // await delay(1000)
  return {
    title: 'Slug!',
    meta: [
      { name: 'description', content: 'I am a description!' },
      { property: 'og:title', content: 'Title!' },
    ],
    props: {
      test: 'TEST!',
    },
    // expire: 0,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
