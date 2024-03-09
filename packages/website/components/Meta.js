export function Meta({ title, description, image }) {
  let titleFull
  if (title) {
    titleFull = title + ' | Firebolt'
  } else {
    titleFull = 'Firebolt'
  }
  if (title && !image) {
    image = encodeURI(`${process.env.PUBLIC_DOMAIN}/og?title=${title}`)
  }
  console.log({ title, titleFull, description, image })
  return (
    <>
      <title>{titleFull}</title>
      <meta name='og:title' content={titleFull} />
      <meta name='twitter:title' content={title} />
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
