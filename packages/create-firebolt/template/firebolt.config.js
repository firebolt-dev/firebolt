import icons from '@firebolt-dev/icons'

export const config = {
  plugins: [
    // generates all favicons and <head> tags
    // from a single routes/icon.svg file
    icons(),
  ],
}
