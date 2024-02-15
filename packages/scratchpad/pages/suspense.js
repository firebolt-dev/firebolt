import { Suspense, useEffect, useMemo, useState } from 'react'
import { css, Link } from 'firebolt'

export default function Page() {
  const resource = wrapPromise(fetchData())
  return (
    <div>
      <Loading />
      <Suspense fallback={<Loading />}>
        <SuspendedContent resource={resource} />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <SuspendedContent resource={resource} />
      </Suspense>
    </div>
  )
}

function Loading() {
  const [foo, setFoo] = useState(false)
  return <div onClick={() => setFoo(!foo)}>Loading... {foo ? 'foo' : ''}</div>
}

function SuspendedContent({ resource }) {
  const data = resource.read()
  return <div>Data: {data}</div>
}

async function fetchData() {
  console.log('fetch data')
  await delay(5000)
  console.log('got data')
  return 'GOT DATA!!!'
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function wrapPromise(promise) {
  let status = 'pending'
  let response

  const suspender = promise.then(
    res => {
      console.log('x-done')
      status = 'success'
      response = res
    },
    err => {
      console.log('x-blah')
      status = 'error'
      response = err
    }
  )
  const read = () => {
    console.log('read', status)
    switch (status) {
      case 'pending':
        throw suspender
      case 'error':
        throw response
      default:
        return response
    }
  }
  return { read }
}

// another way to do it
// see: https://dev.to/roggc/react-18-streaming-ssr-with-suspense-and-data-fetching-on-the-server-how-to-39jh
function createServerData() {
  let done = false
  let promise = null
  let value
  return {
    read: () => {
      if (done) {
        return value
      }
      if (promise) {
        throw promise
      }
      promise = new Promise(resolve => {
        setTimeout(() => {
          done = true
          promise = null
          value = { comments: ['a', 'b', 'c'] }
          resolve()
        }, 6000)
      })
      throw promise
    },
  }
}
