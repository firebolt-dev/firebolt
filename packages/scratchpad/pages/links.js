import { Link, css, useLocation } from 'firebolt'

export default function Links() {
  const location = useLocation()
  return (
    <div>
      <div>Url: {location.url}</div>
      <div>Params: {JSON.stringify(location.params)}</div>
      <div>
        <Link href='/links/one'>/links/one</Link>
      </div>
      <div>
        <Link href='/links/one' replace>
          /links/one (replace)
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
