import { css } from 'firebolt'
import snap from '@firebolt-dev/snap'

import bg from '@/routes/og-bg.png'
import robotoFlex from '@/routes/roboto-flex.woff2'

export async function get(req, ctx) {
  const { title } = ctx.params
  return snap(
    <div
      css={css`
        @font-face {
          font-family: 'Roboto Flex';
          font-style: normal;
          font-weight: 100 1000;
          font-stretch: 100%;
          font-display: swap;
          src: url(${robotoFlex}) format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
            U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
            U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }

        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-image: url(${bg});
        background-size: cover;
        background-position: center;

        .title {
          margin-top: 337px;
          font-size: 70px;
          font-family: 'Roboto Flex';
          font-weight: 600;
          color: white;
        }
      `}
    >
      <div className='title'>{title}</div>
    </div>
  )
}
