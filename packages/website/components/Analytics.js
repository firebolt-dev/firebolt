export function Analytics() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <script
        defer
        data-domain='firebolt.dev'
        src='https://plausible.io/js/script.js'
      />
    )
  }
}
