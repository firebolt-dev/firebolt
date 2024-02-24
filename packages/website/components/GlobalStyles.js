import { useCookie, css } from 'firebolt'

export function GlobalStyles() {
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

const lightVariables = `
  :root {
    --primary-color: rgb(255 65 88);
    --bg-color: white;
    --text-color: black;
    --text-color-dim: rgba(0, 0, 0, 0.64);
    --text-color-dim2: rgba(0, 0, 0, 0.32);
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

const darkVariables = `
  :root {
    --primary-color: rgb(255 65 88);
    --bg-color: rgb(18, 18, 18);
    --text-color: white;
    --text-color-dim: rgba(255, 255, 255, 0.64);
    --text-color-dim2: rgba(255, 255, 255, 0.32);
    --line-color: rgba(255, 255, 255, 0.1);
    --icon-color: white;
    --icon-color-dim: rgba(255, 255, 255, 0.3);
    --header-bg: rgba(18, 18, 18, 0.9);
    --menu-bg: rgb(39 37 37);
    --menu-border: 1px solid rgb(39 37 37);
    --menu-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    --menu-item-hover-bg: rgb(55 51 51);
    --menu-item-active-bg: var(--primary-color);
    --menu-item-active-color: white;

    --inline-code-bg: #2b2b2b;

    .shiki span {
      color: var(--shiki-dark);
    }
  }
`

function Main() {
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

        p {
          line-height: 1.5;
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
