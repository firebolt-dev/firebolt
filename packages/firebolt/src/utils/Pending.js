export function Pending() {
  const listeners = new Set()
  let pending
  return {
    begin() {
      pending = true
    },
    end() {
      pending = false
      for (const callback of listeners) {
        callback()
      }
      listeners.clear()
    },
    wait() {
      if (!pending) return
      return new Promise(resolve => {
        listeners.add(resolve)
      })
    },
  }
}
