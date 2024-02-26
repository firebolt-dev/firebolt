export function Metadata({ title, description }) {
  if (title) {
    title += ' | Firebolt'
  }
  return (
    <>
      {title && (
        <>
          <title>{title}</title>
          <meta name='og:title' content={title} />
          <meta name='twitter:title' content={title} />
        </>
      )}
      {description && (
        <>
          <meta name='description' content={description} />
          <meta name='og:description' content={description} />
          <meta name='twitter:description' content={description} />
        </>
      )}
    </>
  )
}
