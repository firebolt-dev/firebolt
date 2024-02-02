import { Link, css, useLocation } from 'galaxy'

export default function BlogPost() {
  const location = useLocation()
  console.log('params', location.params)
  return (
    <div>
      <div>Blog Post: {location.params.slug}</div>
      <div>Cake: {location.params.cake}</div>
      <div>
        <Link to='/blog/123?cake=true'>With Cake</Link>
      </div>
      <div>
        <Link to='/blog/123'>Without Cake</Link>
      </div>
    </div>
  )
}

export async function getPageData() {
  await delay(1000)
  return {
    title: 'Slug!',
    meta: [
      { name: 'description', content: 'I am a description!' },
      { property: 'og:title', content: 'Title!' },
    ],
    props: {
      test: 'TEST!',
    },
    // expire: 2,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
