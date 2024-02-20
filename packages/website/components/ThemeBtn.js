import { css, cls, useCookie } from 'firebolt'
import { Sun, Moon } from 'lucide-react'

export function ThemeBtn({ className = '' }) {
  const [theme, setTheme] = useCookie('theme', 'system')
  const toggle = () => {
    const system = getSystemTheme()
    if (theme === 'system') {
      if (system === 'dark') {
        setTheme('light')
      } else {
        setTheme('dark')
      }
    }
    if (theme === 'dark') {
      if (system === 'light') {
        setTheme(null)
      } else {
        setTheme('light')
      }
    }
    if (theme === 'light') {
      if (system === 'dark') {
        setTheme(null)
      } else {
        setTheme('dark')
      }
    }
  }
  return (
    <div
      className={cls(className, 'theme-btn', theme)}
      css={css`
        width: 34px;
        height: 34px;
        border: 1px solid var(--line-color);
        border-radius: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        cursor: pointer;
        .theme-btn-light,
        .theme-btn-dark {
          display: none;
        }
        &.light .theme-btn-light {
          display: block;
        }
        &.dark .theme-btn-dark {
          display: block;
        }
        &.system {
          @media (prefers-color-scheme: dark) {
            .theme-btn-dark {
              display: block;
            }
          }
          @media (prefers-color-scheme: light) {
            .theme-btn-light {
              display: block;
            }
          }
        }
      `}
      onClick={toggle}
    >
      <Sun className='theme-btn-light' size={20} />
      <Moon className='theme-btn-dark' size={20} />
    </div>
  )
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
