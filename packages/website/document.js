import { css } from 'firebolt'

import { Theme } from './components/Theme'

export function Document({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' sizes='32x32' />
        <link rel='icon' href='/icon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='true'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap'
          rel='stylesheet'
        />
        <ResetStyles />
        <GlobalStyles />
        <Theme />
      </head>
      <body>{children}</body>
    </html>
  )
}

function ResetStyles() {
  // based on https://www.digitalocean.com/community/tutorials/css-minimal-css-reset
  return (
    <style
      global={css`
        html {
          box-sizing: border-box;
          font-size: 16px;
        }

        *,
        *:before,
        *:after {
          box-sizing: inherit;
        }

        body,
        h1,
        h2,
        h3,
        h4,
        h5,
        h6,
        p,
        ol,
        ul {
          margin: 0;
          padding: 0;
          font-weight: normal;
        }

        ol,
        ul {
          list-style: none;
        }

        img {
          max-width: 100%;
          height: auto;
        }
      `}
    />
  )
}

function GlobalStyles() {
  return (
    <style
      global={css`
        // fix common issue with flex ellipsis

        * {
          min-width: 0;
        }

        // fix alignment of svgs

        svg {
          display: inline-block;
        }

        // text selection

        ::selection {
          color: white;
          background: var(--primary-color);
        }

        // general

        html,
        body {
          -webkit-font-smoothing: antialiased;
          font-family: 'Roboto Flex', sans-serif;
          font-optical-sizing: auto;
          font-weight: 300;
          font-style: normal;
          font-size: 16px;
          font-variation-settings:
            'slnt' 0,
            'wdth' 100,
            'GRAD' 0,
            'XTRA' 468,
            'YOPQ' 79,
            'YTAS' 750,
            'YTDE' -203,
            'YTFI' 738,
            'YTLC' 514,
            'YTUC' 712;

          background-color: var(--bg-color);
          color: var(--text-color);
        }

        a {
          text-decoration: none;
          color: inherit;
        }
      `}
    />
  )
}
