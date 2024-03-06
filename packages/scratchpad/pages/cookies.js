import { Suspense, useState } from 'react'
import { useCookie, useLoader, useAction } from 'firebolt'

export default function Cookies() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Content />
    </Suspense>
  )
}

export function Content() {
  const [on, setOn] = useCookie('on')
  const [lastFetched] = useCookie('lastFetched')
  const toggleOnServer = useAction(toggle)
  const loader = useLoader(getBoop)
  const boop = loader.read()
  return (
    <div>
      <div>Cookies</div>
      <div>On: {on ? 'yes' : 'no'}</div>
      <div>Boop: {boop}</div>
      <div>Last fetched: {lastFetched}</div>
      <div onClick={() => setOn(!on)}>Toggle in browser</div>
      <div onClick={() => toggleOnServer()}>Toggle on server</div>
      <div onClick={() => loader.invalidate()}>Invalidate data</div>
    </div>
  )
}

export async function toggle(ctx) {
  const on = ctx.cookies.get('on')
  ctx.cookies.set('on', !on)
  console.log('on set to', !on)
}

export async function getBoop(ctx) {
  const date = new Date().getTime()
  ctx.cookies.set('lastFetched', date)
  return Math.random()
}
