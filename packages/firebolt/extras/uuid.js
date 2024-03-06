import { customAlphabet } from 'nanoid'

// uuid
// ----
// alphanumeric @ 21 characters
// ~30 million years needed, in order to have a 1% probability of at least one collision.
// see: https://zelark.github.io/nano-id-cc/
export const uuid = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  21
)

// micro uuid
// ----------
// alphanumeric @ 6 characters
// ~7 days or 33K IDs needed, in order to have a 1% probability of at least one collision.
// see: https://zelark.github.io/nano-id-cc/
export const muid = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  6
)
