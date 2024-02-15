import { Highlight, themes } from 'prism-react-renderer'

export default function Prism() {
  return (
    <div>
      <div>Prism:</div>
      <Highlight
        theme={themes.shadesOfPurple}
        code={`const foo = 'bar'`}
        language='jsx'
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span>{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
