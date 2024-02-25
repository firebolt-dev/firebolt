import { Suspense, useState } from 'react'
import { useCookie, useData, useAction } from 'firebolt'

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
  const data = useData(getBoop)
  const boop = data.read()
  return (
    <div>
      <div>Cookies</div>
      <div>On: {on ? 'yes' : 'no'}</div>
      <div>Boop: {boop}</div>
      <div>Last fetched: {lastFetched}</div>
      <div onClick={() => setOn(!on)}>Toggle in browser</div>
      <div onClick={() => toggleOnServer()}>Toggle on server</div>
      <div onClick={() => data.invalidate()}>Invalidate data</div>
    </div>
  )
}

export async function toggle(req) {
  const on = req.getCookie('on')
  req.setCookie('on', !on)
  console.log('on set to', !on)
}

export async function getBoop(req) {
  const date = new Date().getTime()
  req.setCookie('lastFetched', date)
  return Math.random()
}
