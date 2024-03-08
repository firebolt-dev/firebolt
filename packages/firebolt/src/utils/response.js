import { ReadStream } from 'fs'
import { Readable } from 'stream'

/**
 * Patch Web API Response to automatically convert
 * node streams to web streams.
 */

class FireboltResponse extends Response {
  constructor(body, options) {
    if (body instanceof ReadStream) {
      // converts fs.createReadStream(file) to web ReadableStream
      body = Readable.toWeb(body)
    }
    super(body, options)
  }
}

// patch global
globalThis.Response = FireboltResponse
