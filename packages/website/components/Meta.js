export function Meta({ title, description }) {
  let titleExt
  if (title) {
    titleExt = title + ' | Firebolt'
  }
  let image
  if (title) {
    image = encodeURI(`${process.env.PUBLIC_DOMAIN}/og?title=${title}`)
  }
  return (
    <>
      {title && (
        <>
          <title>{titleExt}</title>
          <meta name='og:title' content={titleExt} />
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
      {image && (
        <>
          <meta name='og:image' content={image} />
          <meta name='twitter:image' content={image} />
        </>
      )}
      <meta name='twitter:card' content='summary_large_image' />
    </>
  )
}
