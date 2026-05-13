import mysql from 'mysql2/promise'
import process from 'node:process'
import 'dotenv/config'

const host = process.env.DB_HOST ?? '127.0.0.1'
const port = Number(process.env.DB_PORT ?? 3306)
const user = process.env.DB_USERNAME ?? 'root'
const password = process.env.DB_PASSWORD ?? 'admin123'
const database = process.env.DB_NAME ?? 'photo_order'

async function main() {
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4',
  })

  const [pendingRows] = await connection.query(
    "SELECT COUNT(1) AS total FROM schedules WHERE status = 'pending_confirm'",
  )

  const total = Number(pendingRows?.[0]?.total ?? 0)
  if (!total) {
    await connection.end()
    process.stdout.write('No pending_confirm rows found. Nothing changed.\n')
    return
  }

  const [result] = await connection.query(
    "UPDATE schedules SET status = 'normal' WHERE status = 'pending_confirm'",
  )

  await connection.end()
  process.stdout.write(
    `Cleanup complete. Converted ${result.affectedRows ?? 0} row(s) from pending_confirm to normal.\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`Cleanup failed: ${error.message}\n`)
  process.exit(1)
})
