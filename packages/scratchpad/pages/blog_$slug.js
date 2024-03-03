import { Link, css, useRoute } from 'firebolt'

export default function BlogPost() {
  const route = useRoute()
  console.log('params', route.params)
  return (
    <div>
      <div>Blog Post: {route.params.slug}</div>
      <div>Cake: {route.params.cake}</div>
      <div>
        <Link href='/blog/123?cake=true' replace>
          With Cake
        </Link>
      </div>
      <div>
        <Link href='/blog/123' replace>
          Without Cake
        </Link>
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
