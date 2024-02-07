import { Link, css, useLocation } from 'firebolt'

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

export async function getMetadata() {
  await delay(1000)
  return {
    title: 'Blog post',
    description: `Blog post description`,
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
