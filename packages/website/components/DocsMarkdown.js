import { css, cls } from 'firebolt'
import { Copy, File } from 'lucide-react'

export const components = {
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
    return (
      <h2
        css={css`
          font-size: 24px;
          font-weight: 700;
          margin-top: 32px;
          margin-bottom: 16px;
        `}
        {...props}
      />
    )
  },
  h3(props) {
    return (
      <h3
        css={css`
          font-size: 20px;
          font-weight: 700;
          margin-top: 32px;
          margin-bottom: 16px;
        `}
        {...props}
      />
    )
  },
  p(props) {
    return (
      <p
        css={css`
          margin: 0 0 16px;
          line-height: 1.5;
        `}
        {...props}
      />
    )
  },
  pre(props) {
    // this is the wrapper around a <code> block
    console.log('pre', props)
    const { title, lineNumbers, children } = props
    return (
      <pre
        className={cls('shiki', { lineNumbers })}
        // className='mdx-pre shiki'
        // className={`mdx-pre ${props.className || ''}`}
        css={css`
          border: 1px solid var(--line-color);
          margin: 16px 0;
          border-radius: 8px;
          .code-header {
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--line-color);
            padding: 16px;
          }
          .code-file {
            margin-right: 8px;
          }
          .code-filename {
            flex: 1;
            font-size: 14px;
            font-family: 'Roboto Mono';
            font-weight: 400;
          }
          .code-copy {
            color: var(--icon-color-dim);
            &:hover {
              cursor: pointer;
              color: var(--icon-color);
            }
          }
          .code-content {
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
          <div className='code-header'>
            <File className='code-file' size={16} />
            <div className='code-filename'>{title}</div>
            <Copy className='code-copy' size={16} />
          </div>
        )}
        <div className='code-content'>{children}</div>
      </pre>
    )
  },
  code(props) {
    // this is either inline code or a code block wrapped with a <pre>
    console.log('code', props)
    return (
      <code className={`mdx-code ${props.className || ''}`}>
        {props.children}
      </code>
    )
  },
}
