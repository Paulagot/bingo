// server/config/database.js
import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fundraisely_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false } // Add this for AWS RDS
};

// Debug what the config actually contains
console.log('🗄️ Database Config Debug:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Port:', dbConfig.port);
console.log('Has Password:', !!dbConfig.password);

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