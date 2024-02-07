import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { fireboltHandler } from 'firebolt'

const app = express()

app.use(cors())
app.use(compression())
app.use(fireboltHandler)

app.listen(3000)
