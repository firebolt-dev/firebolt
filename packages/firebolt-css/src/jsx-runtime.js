import runtime from 'react/jsx-runtime'
import { GlobalStyle, Style, createProps } from './index.js'

export const Fragment = runtime.Fragment

export function jsx(type, props, key) {
  if (props.hasOwnProperty('css')) {
    return runtime.jsx(Style, createProps(type, props), key)
  }
  if (props.hasOwnProperty('global') && type === 'style') {
    return runtime.jsx(GlobalStyle, createProps(type, props), key)
  }
  return runtime.jsx(type, props, key)
}

export function jsxs(type, props, key) {
  if (props.hasOwnProperty('css')) {
    return runtime.jsxs(Style, createProps(type, props), key)
  }
  if (props.hasOwnProperty('global') && type === 'style') {
    return runtime.jsxs(GlobalStyle, createProps(type, props), key)
  }
  return runtime.jsxs(type, props, key)
}
