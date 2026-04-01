import mysql from 'mysql2/promise';
import process from 'node:process';
import 'dotenv/config';

const host = process.env.DB_HOST ?? '127.0.0.1';
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USERNAME ?? 'root';
const password = process.env.DB_PASSWORD ?? 'admin123';
const database = process.env.DB_NAME ?? 'photo_order';
const reset = process.env.DB_RESET === 'true';

async function main() {
  const connection = await mysql.createConnection({ host, port, user, password, charset: 'utf8mb4' });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.query(
    `ALTER DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  const [tables] = await connection.query(
    `SELECT TABLE_NAME as tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [database],
  );

  if (reset) {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const row of tables) {
      await connection.query(`DROP TABLE IF EXISTS \`${database}\`.\`${row.tableName}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  await connection.end();
  process.stdout.write(`Database ready: ${database}${reset ? ' (reset mode)' : ''}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to init database: ${error.message}\n`);
  process.exit(1);
});
