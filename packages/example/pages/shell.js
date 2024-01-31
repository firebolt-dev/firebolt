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
    title: 'Shell',
    meta: [{ name: 'description', content: 'Shell' }],
    props: {
      serverMsg: 'BOOP',
    },
    // expire: 0,
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
