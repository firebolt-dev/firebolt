import { Link, css, cls, useCookie, useRoute } from 'firebolt'

import { Logo } from './Logo'
import { LogoX } from './LogoX'
import { LogoGithub } from './LogoGithub'
import { ThemeBtn } from './ThemeBtn'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const route = useRoute()
  return (
    <div
      className='header'
      css={css`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: var(--header-bg);
        backdrop-filter: blur(8px);
        padding: 0 20px;
        z-index: 100;
        border-bottom: 1px solid var(--line-color);
        .header-inner {
          width: 100%;
          max-width: 1300px;
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
        <Link href='/' aria-label='Firebolt logo'>
          <Logo className='header-logo' />
        </Link>
        <div className='header-gap' />
        <Link
          href='/docs'
          className={cls('header-link', {
            active: route.url.startsWith('/docs'),
          })}
        >
          Documentation
        </Link>
        <Link
          href='/blog'
          className={cls('header-link', {
            active: route.url.startsWith('/blog'),
          })}
        >
          Blog
        </Link>
        <div className='header-gap2' />
        <ThemeBtn className='header-theme' />
        <Link
          className='header-social'
          href='https://x.com/firebolt_dev'
          target='_blank'
          aria-label='Follow Firebolt on X'
        >
          <LogoX />
        </Link>
        <Link
          className='header-social'
          href='https://github.com/firebolt-dev/firebolt'
          target='_blank'
          aria-label='View Firebolt on GitHub'
        >
          <LogoGithub />
        </Link>
        <MobileMenu className='header-menu' />
      </div>
    </div>
  )
}
