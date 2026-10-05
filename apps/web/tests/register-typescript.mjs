// register() is supported by the existing Node >=22.13 project baseline.
import { register } from 'node:module'
register('./typescript-loader.mjs', import.meta.url)
