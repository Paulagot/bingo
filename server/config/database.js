// server/config/database.js
import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const dbConfig = {
  // Check both your custom variables AND Railway's auto-generated ones
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'fundraisely_db',
  port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  enableKeepAlive: true,        // 👈 add this
  keepAliveInitialDelay: 0,
  connectionLimit: 30,
  queueLimit: 50,
  ssl: { rejectUnauthorized: false } // Add this for AWS RDS
};

// Debug what the config actually contains
console.log('🗄️ Database Config Debug:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Port:', dbConfig.port);
console.log('Has Password:', !!dbConfig.password);

// Add this debug for Railway variables
console.log('🚂 Railway Variables Debug:');
console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('MYSQL_USER:', process.env.MYSQL_USER);
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('Has MYSQL_PASSWORD:', !!process.env.MYSQL_PASSWORD);

export const connection = mysql.createPool(dbConfig);

// Add table prefix support
export const TABLE_PREFIX = process.env.DB_TABLE_PREFIX || 'fundraisely_';

export async function testConnection() {
  try {
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    console.log('🏷️ Table prefix:', TABLE_PREFIX);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Connection details used:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      hasPassword: !!dbConfig.password
    });
    return false;
  }
}

export async function initializeDatabase() {
  console.log('🔗 Connecting to database...');
  
  const success = await testConnection();
  if (!success) {
    throw new Error('Failed to connect to database');
  }
}
export default { connection, testConnection, initializeDatabase, TABLE_PREFIX };