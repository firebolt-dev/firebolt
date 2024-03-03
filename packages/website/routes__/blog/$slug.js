import { useRoute } from 'firebolt'

export default function BlogPost() {
  const { slug } = useRoute().params
  return <div>Blog Post Slug = {slug}</div>
}
