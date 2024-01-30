import { css } from 'galaxy'

export default function Page({ serverMsg }) {
  return (
    <div
      css={css`
        color: blue;
      `}
    >
      Shell replaced with real page! ({serverMsg || ''})
    </div>
  )
}

export function Shell() {
  return (
    <div
      css={css`
        color: red;
      `}
    >
      Shell (loading)
    </div>
  )
}

export async function getMetadata() {
  await delay(1000)
  return {
    title: 'Title!',
    description: 'Description!',
    // meta: [
    //   { name: 'description', content: 'I am a description!' },
    //   { property: 'og:title', content: 'Title!' },
    // ],
    props: {
      serverMsg: 'BOOP',
    },
    // data expiration
    // - when not set, clients will only fetch metadata for each page once and re-use old data when navigating back to it, forever (unless hard refresh)
    // - when set to 0, metadata immediately expires so clients will always re-fetch metadata when coming back to the page
    // - when set to >0, metadata will be cached for X seconds, after that it will be re-fetched and cached again
    expire: 0,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
