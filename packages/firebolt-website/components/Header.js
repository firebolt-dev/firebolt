import { Link, css, cls, useCookie, useLocation } from 'firebolt'

import { Logo } from './Logo'
import { LogoX } from './LogoX'
import { LogoGithub } from './LogoGithub'
import { ThemeBtn } from './ThemeBtn'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const location = useLocation()
  return (
    <div
      className='header'
      css={css`
        padding: 0 20px;
        .header-inner {
          width: 100%;
          max-width: 1275px;
          margin: 0 auto;
          height: 70px;
          display: flex;
          align-items: center;
        }
        .header-logo {
          height: 34px;
          width: auto;
        }
        .header-gap {
          flex: 1;
        }
        .header-link {
          color: var(--text-color-dim);
          margin-left: 24px;
          &.active {
            color: var(--text-color);
            text-decoration: underline;
          }
        }
        .header-gap2 {
          width: 50px;
        }
        .header-social {
          margin-left: 20px;
          width: 24px;
          flex-shrink: 0;
        }
        .header-menu {
          display: none;
          margin-left: 20px;
        }
        @media all and (max-width: 600px) {
          .header-link {
            display: none;
          }
          .header-menu {
            display: block;
          }
        }
      `}
    >
      <div className='header-inner'>
        <Link to='/'>
          <a>
            <Logo className='header-logo' />
          </a>
        </Link>
        <div className='header-gap' />
        <Link
          to='/docs'
          className={cls('header-link', {
            active: location.url.startsWith('/docs'),
          })}
        >
          Documentation
        </Link>
        <Link
          to='/blog'
          className={cls('header-link', {
            active: location.url.startsWith('/blog'),
          })}
        >
          Blog
        </Link>
        <div className='header-gap2' />
        <ThemeBtn className='header-theme' />
        <a
          className='header-social'
          href='https://x.com/firebolt_dev'
          target='_blank'
        >
          <LogoX />
        </a>
        <a
          className='header-social'
          href='https://github.com/firebolt-dev'
          target='_blank'
        >
          <LogoGithub />
        </a>
        <MobileMenu className='header-menu' />
      </div>
    </div>
  )
}
