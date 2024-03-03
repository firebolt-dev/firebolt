import fetch, { Headers, FormData, Request, Response } from 'node-fetch'

globalThis.fetch = fetch
globalThis.Headers = Headers
globalThis.FormData = FormData

// these are extended
globalThis.FetchRequest = Request
globalThis.FetchResponse = Response
