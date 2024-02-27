import { useRef, useState } from 'react'
import { Link, css, cls } from 'firebolt'
import { Check, Copy, File, Link as LinkIcon } from 'lucide-react'

import { Metadata } from './Metadata'

export const components = {
  Metadata,
  h1(props) {
    return (
      <h1
        css={css`
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 32px;
        `}
        {...props}
      />
    )
  },
  h2(props) {
    const id = stringToId(props.children)
    return (
      <h2
        {...props}
        id={id}
        css={css`
          font-size: 24px;
          font-weight: 700;
          margin-top: 32px;
          margin-bottom: 16px;
          scroll-margin-top: 102px;
        `}
      >
        <Anchor id={id}>{props.children}</Anchor>
      </h2>
    )
  },
  h3(props) {
    const id = stringToId(props.children)
    return (
      <h3
        {...props}
        id={id}
        css={css`
          font-size: 18px;
          font-weight: 700;
          margin-top: 32px;
          margin-bottom: 16px;
          scroll-margin-top: 102px;
        `}
      >
        <Anchor id={id}>{props.children}</Anchor>
      </h3>
    )
  },
  p(props) {
    return (
      <p
        css={css`
          margin: 0 0 16px;
        `}
        {...props}
      />
    )
  },
  a(props) {
    return (
      <Link
        href={props.href}
        css={css`
          color: var(--primary-color);
        `}
      >
        {props.children}
      </Link>
    )
  },
  pre(props) {
    const ref = useRef()
    const [copied, setCopied] = useState(false)
    const copy = () => {
      const elem = ref.current.querySelector('code')
      navigator.clipboard.writeText(elem.innerText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
    // this is the wrapper around a <code> block
    // console.log('pre', props)
    const { title, lineNumbers, children } = props
    return (
      <pre
        ref={ref}
        className={cls('shiki', { lineNumbers })}
        css={css`
          border: 1px solid var(--line-color);
          margin: 24px 0;
          border-radius: 8px;
          .pre-header {
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--line-color);
            height: 50px;
            padding: 0 8px 0 16px;
          }
          .pre-file {
            margin-right: 8px;
          }
          .pre-filename {
            flex: 1;
            font-size: 14px;
            font-family: 'Roboto Mono';
            font-weight: 400;
          }
          .pre-copy {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--icon-color-dim);
            &:hover {
              cursor: pointer;
              color: var(--icon-color);
            }
          }
          .pre-copied {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--icon-color);
          }
          .pre-content {
            padding: 16px;
            overflow-x: auto;
            font-size: 14px;
          }
          &.lineNumbers {
            code {
              counter-reset: step;
              counter-increment: step 0;
            }
            code .line::before {
              content: counter(step);
              counter-increment: step;
              width: 1rem;
              margin-right: 1.5rem;
              display: inline-block;
              text-align: right;
              color: rgba(115, 138, 148, 0.4);
            }
            code > .line:last-child {
              display: none;
            }
          }
        `}
      >
        {title && (
          <div className='pre-header'>
            <File className='pre-file' size={16} />
            <div className='pre-filename'>{title}</div>
            {!copied && (
              <div className='pre-copy' onClick={copy}>
                <Copy size={16} />
              </div>
            )}
            {copied && (
              <div className='pre-copied'>
                <Check size={18} />
              </div>
            )}
          </div>
        )}
        <div className='pre-content'>{children}</div>
      </pre>
    )
  },
  code(props) {
    // this is either inline code or a code block wrapped with a <pre>
    // console.log('code', props)
    return (
      <code
        className={`${props.className || ''}`}
        css={css`
          font-family: 'Roboto Mono', monospace;
          font-weight: 400;
          // inline code
          :not(pre) & {
            display: inline-block;
            background: var(--inline-code-bg);
            padding: 3px 6px;
            border-radius: 6px;
            line-height: 1.2;
            white-space: nowrap;
            font-size: 0.9em;
          }
          // block code
          pre & {
            display: inherit;
            background: none;
            padding: 0;
            border-radius: 0;
            line-height: 1.6;
            white-space: inherit;
            font-size: inherit;
          }
        `}
      >
        {props.children}
      </code>
    )
  },
  table(props) {
    return (
      <div
        css={css`
          overflow-x: auto;
          margin: 32px 0;
          table {
            width: 100%;
            text-align: left;
          }
          th {
            padding: 0 8px 16px;
            font-weight: 500;
          }
          tr th:first-child {
            padding-left: 0;
          }
          td {
            padding: 0 8px 16px;
          }
          tr td:first-child {
            padding-left: 0;
          }
        `}
      >
        <table {...props} />
      </div>
    )
  },
  ul(props) {
    return (
      <ul
        {...props}
        css={css`
          list-style-type: disc;
          padding-left: 32px;
          li {
            padding-left: 4px;
            line-height: 1.5;
            margin: 0 0 8px;
          }
        `}
      />
    )
  },
}

function stringToId(str) {
  // converts a string into an ID that can be used for anchors
  str = str.toLowerCase()
  str = str
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return str
}

function Anchor({ id, children }) {
  return (
    <a
      href={`#${id}`}
      css={css`
        > svg {
          display: none;
          margin-left: 0.1em;
          margin-top: -0.1em;
          vertical-align: middle;
          line-height: 1;
        }
        &:hover {
          color: var(--primary-color);
          > svg {
            display: inline-block;
          }
        }
      `}
    >
      {children}
      <LinkIcon size='.8em' />
    </a>
  )
}
