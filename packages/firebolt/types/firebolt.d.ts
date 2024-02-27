declare module 'firebolt' {
  /**
   * Use a loader
   *
   * @param fn - The function to be executed.
   * @param args - A list of arguments to pass to the function. These can be strings, numbers, or JSON objects.
   * @return The result of the executed function.
   */
  function useLoader<T>(fn: (...args: any[]) => T, ...args: any[]): T
}
