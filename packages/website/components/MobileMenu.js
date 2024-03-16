import { useEffect, useState } from 'react'
import { Link, css, cls, useRoute } from 'firebolt'
import { Menu, Code, BookText, Home } from 'lucide-react'

export function MobileMenu({ className = '' }) {
  const route = useRoute()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
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
          width: 150px;
          background: var(--menu-bg);
          border: var(--menu-border);
          border-radius: 8px;
          box-shadow: var(--menu-shadow);
          padding: 10px 0;
        }
        .menu-item {
          display: flex;
          align-items: center;
          font-weight: 500;
          padding: 10px 20px;
          &:hover {
            cursor: pointer;
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
          <Link href='/' onClick={close}>
            <div
              className={cls('menu-item', {
                active: route.url === '/',
              })}
            >
              <Home className='menu-item-icon' size={20} />
              <span>Home</span>
            </div>
          </Link>
          <Link href='/docs' onClick={close}>
            <div
              className={cls('menu-item', {
                active: route.url.startsWith('/docs'),
              })}
            >
              <Code className='menu-item-icon' size={20} />
              <span>Docs</span>
            </div>
          </Link>
          <Link href='/blog' onClick={close}>
            <div
              className={cls('menu-item', {
                active: route.url.startsWith('/blog'),
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
