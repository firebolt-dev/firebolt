export function Meta({ title, description, image, root }) {
  const titleExt = root ? title : `${title} | Firebolt`
  if (image) {
    image = `${process.env.PUBLIC_DOMAIN}${image}`
  } else {
    image = encodeURI(`${process.env.PUBLIC_DOMAIN}/og?title=${title}`)
  }
  return (
    <>
      <title>{titleExt}</title>
      <meta name='og:title' content={titleExt} />
      <meta name='twitter:title' content={title} />
      <meta name='description' content={description} />
      <meta name='og:description' content={description} />
      <meta name='twitter:description' content={description} />
      <meta name='og:image' content={image} />
      <meta name='twitter:image' content={image} />
      <meta name='twitter:card' content='summary_large_image' />
    </>
  )
}
