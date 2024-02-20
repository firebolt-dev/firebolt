import { useMemo } from 'react'
import { Marked } from 'marked'

export function Markdown({ components, children }) {
  return useMemo(() => {
    let ids = 0
    const renderer = {
      id() {
        return ++ids
      },
      get(name) {
        return components[name] || defaultComponents[name]
      },
    }
    const marked = new Marked()
    const options = {
      breaks: false,
      gfm: true,
    }
    const string = children
    const tokens = marked.lexer(string, options)
    return tokens.map(token => parse(token, renderer))
  }, [components, children])
}

function parseMulti(tokens, info) {
  return tokens.map(token => parse(token, info))
}

function parse(token, info) {
  const id = info.id()
  switch (token.type) {
    case 'code': {
      const Component = info.get('Code')
      return (
        <Component key={id} lang={token.lang}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'blockquote': {
      const Component = info.get('BlockQuote')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'html': {
      return null
    }
    case 'heading': {
      const Component = info.get(`Heading${token.depth}`)
      return (
        <Component key={id} depth={token.depth}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'hr': {
      const Component = info.get('Divider')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'list': {
      const Component = info.get(
        token.ordered ? `OrderedList` : `UnorderedList`
      )
      return (
        <Component key={id}>
          {token.items ? parseMulti(token.items, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'list_item': {
      const Component = info.get(
        token.ordered ? `OrderedList` : `UnorderedList`
      )
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    // case 'checkbox': {
    //   return <div>CHECK</div>
    // }
    case 'paragraph': {
      const Component = info.get('Paragraph')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'table': {
      const Component = info.get('Table')
      const header = parse(
        {
          type: 'table_header',
          tokens: [
            {
              type: 'table_row',
              tokens: token.header.map(token => {
                return {
                  ...token,
                  type: 'table_header_cell',
                }
              }),
            },
          ],
        },
        info
      )
      const body = parse(
        {
          type: 'table_body',
          tokens: token.rows.map(row => {
            return {
              type: 'table_row',
              tokens: row.map(token => {
                return {
                  ...token,
                  type: 'table_cell',
                }
              }),
            }
          }),
        },
        info
      )
      return <Component key={id}>{[header, body]}</Component>
    }
    case 'table_header': {
      const Component = info.get('TableHeader')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'table_header_cell': {
      const Component = info.get('TableHeaderCell')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'table_body': {
      const Component = info.get('TableBody')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'table_row': {
      const Component = info.get('TableRow')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'table_cell': {
      const Component = info.get('TableCell')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'strong': {
      const Component = info.get('Bold')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'em': {
      const Component = info.get('Italic')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'codespan': {
      const Component = info.get('InlineCode')
      return (
        <Component key={id}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    // TODO: br
    // TODO: del (text)
    case 'link': {
      const Component = info.get('Link')
      return (
        <Component key={id} href={token.href}>
          {token.tokens ? parseMulti(token.tokens, info) : unescape(token.text)}
        </Component>
      )
    }
    case 'image': {
      const Component = info.get('Image')
      return <Component key={id} href={token.href} alt={token.text} />
    }
    case 'text': {
      return unescape(token.text)
    }
    case 'space': {
      return null
    }
    default: {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`unhandled markdown component: ${token.type}`)
      }
    }
  }
}

const defaultComponents = {
  Code({ lang, children }) {
    return <pre>{children}</pre>
  },
  BlockQuote({ children }) {
    return <blockquote>{children}</blockquote>
  },
  Heading1({ children }) {
    return <h1>{children}</h1>
  },
  Heading2({ children }) {
    return <h2>{children}</h2>
  },
  Heading3({ children }) {
    return <h3>{children}</h3>
  },
  Heading4({ children }) {
    return <h4>{children}</h4>
  },
  Divider({ children }) {
    return <hr />
  },
  OrderedList({ children }) {
    return <ol>{children}</ol>
  },
  UnorderedList({ children }) {
    return <ul>{children}</ul>
  },
  ListItem({ children }) {
    return <li>{children}</li>
  },
  Paragraph({ children }) {
    return <p>{children}</p>
  },
  Table({ children }) {
    return <table>{children}</table>
  },
  TableHeader({ children }) {
    return <thead>{children}</thead>
  },
  TableHeaderCell({ children }) {
    return <th>{children}</th>
  },
  TableBody({ children }) {
    return <tbody>{children}</tbody>
  },
  TableRow({ children }) {
    return <tr>{children}</tr>
  },
  TableCell({ children }) {
    return <td>{children}</td>
  },
  Bold({ children }) {
    return <b>{children}</b>
  },
  Italic({ children }) {
    return <i>{children}</i>
  },
  InlineCode({ children }) {
    return <code>{children}</code>
  },
  Link({ href, children }) {
    return <a href={href}>{children}</a>
  },
  Image({ href, alt, children }) {
    return <img href={href} alt={alt} />
  },
}

const htmlUnescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

/** Used to match HTML entities and HTML characters. */
const reEscapedHtml = /&(?:amp|lt|gt|quot|#(?:0+)?39);/g
const reHasEscapedHtml = RegExp(reEscapedHtml.source)

export const unescape = (str = '') => {
  return reHasEscapedHtml.test(str)
    ? str.replace(reEscapedHtml, entity => htmlUnescapes[entity] || "'")
    : str
}
