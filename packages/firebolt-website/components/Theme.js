import { useCookie, css } from 'firebolt'

export function Theme() {
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
  }
`

const darkVariables = `
  :root {
    --primary-color: rgb(255 65 88);
    --bg-color: rgb(18, 18, 18);
    --text-color: white;
    --text-color-dim: rgba(255, 255, 255, 0.64);
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
  }
`
