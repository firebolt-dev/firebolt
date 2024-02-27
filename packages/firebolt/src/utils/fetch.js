import fetch, { Headers, Request, Response } from 'node-fetch'

globalThis.fetch = fetch
globalThis.FetchHeaders = Headers
globalThis.FetchRequest = Request
globalThis.FetchResponse = Response
