import { forwardRef } from 'react'
import { hashString } from './hashString'
import { compile, serialize, stringify, middleware, prefixer } from 'stylis'

let typePropName = '__FIREBOLT_COMPONENT__'

const cache = {}

const getStyle = css => {
  const key = css
  if (cache[key]) return cache[key]
  const hash = hashString(css)
  const className = `_${hash}`
  const wrappedCSS = `.${className} { ${css} }`
  const string = serialize(
    compile(wrappedCSS),
    middleware([prefixer, stringify])
  )
  const style = {
    hash,
    className,
    wrappedCSS,
    string,
    css,
    isStyle: true,
  }
  cache[key] = style
  return style
}

const getGlobalStyle = css => {
  const key = 'global: ' + css
  if (cache[key]) return cache[key]
  const hash = hashString(css)
  const string = serialize(compile(css), middleware([prefixer, stringify]))
  const style = {
    hash,
    string,
  }
  cache[key] = style
  return style
}

export function GlobalStyle(props) {
  const css = props.global
  if (typeof css !== 'string') {
    throw new Error('invalid global css prop value')
  }
  const style = getGlobalStyle(css)
  return (
    <style
      // react style hoisting doesn't remove styles when the owned component unmounts/remounts.
      // this is problematic because global styles that swap in and out (eg light and dark themes) will result in
      // both stylesheets being inserted into the header at the same time.
      // we need global styles to always unmount with components, so we stick to regular style inlining.
      // href={style.hash}
      // precedence='high'
      dangerouslySetInnerHTML={{ __html: style.string }}
    />
  )
}

export const Style = forwardRef(function Style(props, ref) {
  const Component = props[typePropName]
  const css = props.css
  if (typeof css !== 'string') {
    throw new Error('invalid css prop value')
  }
  const style = getStyle(css)
  const newProps = {}
  for (let key in props) {
    if (
      hasOwnProperty.call(props, key) &&
      key !== 'css' &&
      key !== typePropName
    ) {
      newProps[key] = props[key]
    }
  }
  newProps.ref = ref
  newProps.className = `${style.className} ${props.className || ''}`
  return (
    <>
      <style
        href={style.hash}
        precedence='medium'
        dangerouslySetInnerHTML={{ __html: style.string }}
      />
      <Component {...newProps} />
    </>
  )
})

export function createProps(type, props) {
  const newProps = {}
  for (let key in props) {
    if (hasOwnProperty.call(props, key)) {
      newProps[key] = props[key]
    }
  }
  newProps[typePropName] = type
  return newProps
}

export function css(strings, ...values) {
  // recombine
  let str = strings[0]
  for (let i = 0; i < values.length; i++) {
    let value = values[i]
    if (!value) continue
    if (value.isStyle) value = value.css
    str += value + strings[i + 1]
  }
  return str
}
