import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { server } from 'galaxy'

const app = express()

app.use(cors())
app.use(compression())
app.use(server())

app.listen(3000)
