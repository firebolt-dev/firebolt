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
    --primary-color: #ff4158;
    --bg-color: white;
    --text-color: black;
    --text-color-dim: rgba(0, 0, 0, 0.64);
    --line-color: rgba(0, 0, 0, 0.1);
    --icon-color: black;
    --icon-color-dim: rgba(0, 0, 0, 0.3);
    --menu-bg: white;
    --menu-border: 1px solid #efefef;
    --menu-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    --menu-item-hover-bg: #f0f0f0;
    --menu-item-active-bg: var(--primary-color);
    --menu-item-active-color: white;
  }
`

const darkVariables = `
  :root {
    --primary-color: #ff4158;
    --bg-color: #121212;
    --text-color: white;
    --text-color-dim: rgba(255, 255, 255, 0.64);
    --line-color: rgba(255, 255, 255, 0.1);
    --icon-color: white;
    --icon-color-dim: rgba(255, 255, 255, 0.3);
    --menu-bg: #272525;
    --menu-border: 1px solid #272525;
    --menu-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    --menu-item-hover-bg: #373333;
    --menu-item-active-bg: var(--primary-color);
    --menu-item-active-color: white;
  }
`
