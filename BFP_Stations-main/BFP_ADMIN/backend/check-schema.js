import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bfp_emergency_system',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  })

  try {
    // Check users table structure
    const [usersColumns] = await connection.query('DESCRIBE users')
    console.log('=== USERS TABLE COLUMNS ===')
    console.table(usersColumns)

    // Check alarms table structure
    const [alarmsColumns] = await connection.query('DESCRIBE alarms')
    console.log('\n=== ALARMS TABLE COLUMNS ===')
    console.table(alarmsColumns)

    // Check existing users
    const [users] = await connection.query('SELECT * FROM users LIMIT 5')
    console.log('\n=== EXISTING USERS (sample) ===')
    console.table(users)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await connection.end()
  }
}

checkSchema()
