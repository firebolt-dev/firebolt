import { css } from 'firebolt'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

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
        `}
        {...props}
      />
    )
  },
  code({ className, ...props }) {
    // this is both block and inline code.
    // if we have a language we
    // console.log({ className, props })
    const match = /language-(\w+)/.exec(className || '')
    // console.log({ match })
    const lang = match?.[1]

    // if we have a language use a code block
    if (lang) {
      return <SyntaxHighlighter language={lang} PreTag='div' {...props} />
    }
    // otherwise use inline code
    return (
      <code
        className={className}
        {...props}
        css={css`
          color: red;
        `}
      />
    )
  },
  pre({ children, filename, ...props }) {
    // this is just the wrapper around code blocks
    // console.log('RRR', props)
    return (
      <div
        css={css`
          border: 1px solid var(--line-color);
          margin: 16px 0;
          padding: 16px;
          border-radius: 8px;
          color: blue;
        `}
        {...props}
      >
        {filename && <div>{filename}</div>}
        {children}
      </div>
    )
  },
}
