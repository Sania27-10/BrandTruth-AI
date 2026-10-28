import 'dotenv/config'
import { connectDB } from './db/index.js'
import app from './app.js'

await connectDB()
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`BrandTruth AI running on port ${port}`))
