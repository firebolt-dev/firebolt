declare module 'firebolt' {
  /**
   * Executes the provided function with the given arguments.
   *
   * @param fn - The function to be executed.
   * @param args - A list of arguments to pass to the function. These can be strings, numbers, or JSON objects.
   * @return The result of the executed function.
   */
  function useData<T>(fn: (...args: any[]) => T, ...args: any[]): T
}
