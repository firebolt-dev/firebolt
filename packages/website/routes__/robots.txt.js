export function get(req) {
  return new Response('ROBOTS ARGHHH', {
    headers: { 'Content-Type': 'text/plain' },
  })
}
