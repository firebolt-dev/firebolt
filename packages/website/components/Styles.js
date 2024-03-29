import { useCookie, css } from 'firebolt'

export function Styles() {
  return (
    <>
      <Reset />
      <Theme />
      <Main />
    </>
  )
}

function Reset() {
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

function Theme() {
  const [theme] = useCookie('theme', 'system')
  return (
    <style
      global={css`
        ${theme === 'light' && lightVariables}
        ${theme === 'dark' && darkVariables}
            ${theme === 'system' &&
        `
              @media (prefers-color-scheme: light) {
                ${lightVariables}
              }
              @media (prefers-color-scheme: dark) {
                ${darkVariables}
              }
            `}
      `}
    />
  )
}

const lightVariables = css`
  :root {
    --primary-color: rgb(244 63 94);
    --bg-color: white;
    --bg2-color: white;
    --text-color: rgb(23, 23, 23);
    --text-color-dim: rgb(102, 102, 102);
    --line-color: rgba(0, 0, 0, 0.1);
    --icon-color: black;
    --icon-color-dim: rgba(0, 0, 0, 0.3);
    --header-bg: rgba(255, 255, 255, 0.9);
    --menu-bg: white;
    --menu-border: 1px solid rgb(239 239 239);
    --menu-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    --menu-item-hover-bg: rgb(240 240 240);
    --menu-item-active-bg: var(--primary-color);
    --menu-item-active-color: white;

    --inline-code-bg: #f0f0f0;

    .shiki span {
      color: var(--shiki-light);
    }
  }
`

const darkVariables = css`
  :root {
    --primary-color: rgb(244 63 94);
    --bg-color: rgb(10, 14, 18);
    --bg2-color: rgb(15, 18, 25);
    --text-color: rgba(237, 237, 237);
    --text-color-dim: rgb(92, 101, 113);
    --line-color: rgb(35, 41, 45);
    --icon-color: white;
    --icon-color-dim: rgba(255, 255, 255, 0.3);
    --header-bg: rgba(10, 14, 18, 0.9);
    --menu-bg: rgb(10, 14, 18);
    --menu-border: 1px solid rgb(39 37 37);
    --menu-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    --menu-item-hover-bg: rgb(55 51 51);
    --menu-item-active-bg: var(--primary-color);
    --menu-item-active-color: white;

    --inline-code-bg: rgb(34, 38, 46);

    .shiki span {
      color: var(--shiki-dark);
    }
  }
`

function Main() {
  return (
    <style
      global={css`
        // fonts

        @font-face {
          font-family: 'Roboto Flex';
          font-style: normal;
          font-weight: 100 1000;
          font-stretch: 100%;
          font-display: swap;
          src: url(/roboto-flex.woff2) format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
            U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
            U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }

        @font-face {
          font-family: 'Roboto Mono';
          font-style: normal;
          font-weight: 100 700;
          font-display: swap;
          src: url(/roboto-mono.woff2) format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
            U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
            U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }

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

        p {
          line-height: 1.9;
        }

        pre {
          margin: 0;
        }

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
