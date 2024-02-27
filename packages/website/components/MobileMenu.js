import { useEffect, useState } from 'react'
import { Link, css, cls, useLocation } from 'firebolt'
import { Menu, Code, BookText, Home } from 'lucide-react'

export function MobileMenu({ className = '' }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onWindowClick = e => {
      if (e.defaultPrevented) return
      setOpen(false)
    }
    window.addEventListener('click', onWindowClick)
    return () => {
      window.removeEventListener('click', onWindowClick)
    }
  }, [open])
  return (
    <div
      className={className}
      css={css`
        position: relative;
        .menu-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .menu-content {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 180px;
          background: var(--menu-bg);
          border: var(--menu-border);
          border-radius: 8px;
          box-shadow: var(--menu-shadow);
        }
        .menu-item {
          display: flex;
          align-items: center;
          height: 40px;
          padding: 0 8px;
          margin: 4px;
          border-radius: 4px;
          &:hover {
            cursor: pointer;
            background: var(--menu-item-hover-bg);
          }
          &.active {
            background: var(--menu-item-active-bg);
            color: var(--menu-item-active-color);
          }
        }
        .menu-item-icon {
          margin-right: 8px;
        }
      `}
    >
      <div
        className='menu'
        onClick={e => {
          if (e.defaultPrevented) return
          e.preventDefault()
          setOpen(!open)
        }}
      >
        <Menu />
      </div>
      {open && (
        <div className='menu-content'>
          {/* <Link href='/'>
            <div
              className={cls('menu-item', {
                active: location.url === '/',
              })}
            >
              <Home className='menu-item-icon' size={20} />
              <span>Home</span>
            </div>
          </Link> */}
          <Link href='/docs'>
            <div
              className={cls('menu-item', {
                active: location.url.startsWith('/docs'),
              })}
            >
              <Code className='menu-item-icon' size={20} />
              <span>Documentation</span>
            </div>
          </Link>
          <Link href='/blog'>
            <div
              className={cls('menu-item', {
                active: location.url.startsWith('/blog'),
              })}
            >
              <BookText className='menu-item-icon' size={20} />
              <span>Blog</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
