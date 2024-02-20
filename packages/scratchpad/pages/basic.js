import { Link } from 'firebolt'

export default function Page() {
  return (
    <div>
      <div>Basic Page</div>
      <div>This is a basic page, rendered instantly server-side</div>
      <div>
        <Link to='/basic-head'>Basic + Head</Link>
      </div>
      <div>
        <Link to='/dynamic/123'>Dynamic</Link>
      </div>
      <div>
        <Link to='/loading/123'>Dynamic + Loading</Link>
      </div>
    </div>
  )
}
