import { Link } from 'firebolt'

export default function () {
  console.log('Page Test 1 Content')
  return (
    <div>
      <div>Test 1</div>
      <div>
        <Link to='/test2'>Test 2</Link>
      </div>
    </div>
  )
}
