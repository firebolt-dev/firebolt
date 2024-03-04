declare module 'firebolt' {
  /**
   * Use a loader
   *
   * @param fn - The function to be executed.
   * @param args - A list of arguments to pass to the function. These can be strings, numbers, or JSON objects.
   * @return The result of the executed function.
   */
  function useLoader<T>(fn: (...args: any[]) => T, ...args: any[]): T

  interface UseRoute {
    /**
     * The base URL including any hash and query parameters, e.g., /cities/paris?lang=fr#transport.
     */
    url: string
    /**
     * The path of the current URL, e.g., /cities/paris.
     */
    pathname: string
    /**
     * The hash of the current URL, e.g., #transport.
     */
    hash: string
    /**
     * An object that includes both search params and dynamic route segment values.
     */
    params: {
      [key: string]: string
    }
    /**
     * Updates search params in the URL.
     * @param key The search parameter key.
     * @param value The value to set for the key.
     */
    search(key: string, value: string): void
    /**
     * Performs client-side navigation, adding the new route.
     * @param href The URL to navigate to.
     */
    push(href: string): void
    /**
     * Performs client-side navigation, replacing the current route with the new route.
     * @param href The URL to navigate to.
     */
    replace(href: string): void
    /**
     * Navigate to the previous route in the history.
     */
    back(): void
    /**
     * Navigate to the next route in the history.
     */
    forward(): void
  }

  /**
   * Hook that provides details about the current route and methods to redirect users to another location.
   * @return An object containing details about the route and navigation methods.
   */
  function useRoute(): UseRoute

  /**
   * Access and modify a cookie value.
   *
   * @param key - The cookie key.
   * @param defaultValue - The optional default value for the cookie.
   * @returns A tuple containing the current cookie value and a setter function.
   */
  function useCookie<T = string>(
    key: string,
    defaultValue?: T
  ): [
    T,
    (
      value: T | ((prevValue: T) => T),
      options?: {
        expires?: number | Date
        path?: string
        domain?: string
        secure?: boolean
        sameSite?: 'lax' | 'strict' | 'none'
      }
    ) => void,
  ]

  interface CookieOptions {
    expires?: number | Date
    path?: string
    domain?: string
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
  }

  interface Loader<T> {
    read: () => T
    invalidate: () => void
    set: (newData: T) => void
    edit: (editFn: (data: T) => void) => void
  }

  /**
   * Use a loader to fetch data with the provided loader function and arguments.
   *
   * @param fn - The loader function to be executed. This function should return a Promise that resolves to the data to be loaded.
   * @param args - A list of arguments to pass to the loader function. These arguments are also used to construct a cache key.
   * @returns A loader instance specific to the data being loaded. The loader instance provides methods to read, invalidate, set, and edit the loaded data.
   */
  function useLoader<T>(
    fn: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Loader<T>

  /**
   * Hooks into an action function for server-side operations.
   *
   * @param actionFn - The action function to be executed.
   * @returns A function that, when called, executes the specified action function.
   */
  function useAction<T = any>(
    actionFn: (req: Request, ...args: any[]) => Promise<T>
  ): (...args: any[]) => Promise<T>

  type LoaderFunction<T> = (...args: any[]) => T

  interface Cache {
    /**
     * Invalidates all loaders that match the provided arguments.
     * @param args - Arguments or tags used to identify loaders to invalidate.
     */
    invalidate(...args: any[]): void

    /**
     * Retrieves the first loader instance that matches the provided arguments.
     * @param args - Arguments used to find a loader instance.
     * @returns The first loader instance matching the arguments.
     */
    find(...args: any[]): LoaderFunction<any> | undefined

    /**
     * Retrieves all loader instances that match the provided arguments.
     * @param args - Arguments used to find loader instances.
     * @returns An array of loader instances matching the arguments.
     */
    findAll(...args: any[]): LoaderFunction<any>[]
  }

  /**
   * Accesses the cache instance for interacting with loaders and their data.
   * @returns The cache instance.
   */
  function useCache(): Cache

  interface LinkProps {
    /**
     * The path or URL to navigate to. Required.
     */
    href: string
    /**
     * Whether to replace the current route with this one instead of adding a new history item.
     * Defaults to `false`.
     */
    replace?: boolean
    /**
     * Whether to scroll to the top of the page when navigating.
     * Defaults to `true`.
     */
    scroll?: boolean
    /**
     * Whether to prefetch the bundle for this page before the user clicks.
     * Defaults to `true`.
     */
    prefetch?: boolean
    /**
     * Children to render inside the Link component.
     */
    children?: React.ReactNode
  }

  const Link: React.ComponentType<LinkProps>

  // Type for the fallback prop: component, JSX, or function returning JSX
  type FallbackType = React.ReactElement | ((err: Error) => React.ReactElement)

  // ErrorBoundary component props definition
  interface ErrorBoundaryProps {
    fallback: FallbackType
    children?: React.ReactNode
  }

  // ErrorBoundary component declaration
  const ErrorBoundary: React.ComponentType<ErrorBoundaryProps>

  interface Request {
    cookies: {
      get(key: string): string | null
      set(key: string, value: string | null, options?: CookieOptions): void
    }
    expire(seconds: number): void
    invalidate(...args: any[]): void
    redirect(url: string, type?: 'push' | 'replace'): void
    error(data: any): void
    params: object
  }

  /**
   * CSS tagged template literal for scoped styles.
   *
   * @param strings - Template strings array.
   * @param values - Template literals' values.
   * @return An object representing the styles.
   */
  function css(strings: TemplateStringsArray, ...values: any[]): CSSProperties

  /**
   * Represents CSS properties.
   */
  interface CSSProperties {
    [key: string]: string | number | CSSProperties
  }

  /**
   * Props for style components, allowing for global styles.
   */
  interface StyleProps {
    global?: CSSProperties
  }

  /**
   * Dynamically construct class names.
   *
   * @param args - A list of arguments that can be a string or an object.
   *               A string argument adds the string as a class.
   *               An object argument adds each key as a class if its value is truthy.
   * @return A concatenated string of class names.
   */
  function cls(...args: (string | { [key: string]: boolean })[]): string
}
