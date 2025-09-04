import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const testConnection = async () => {
  console.log('Testing AWS database connection...');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_PORT:', process.env.DB_PORT);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      ssl: { rejectUnauthorized: false } // Often needed for AWS RDS
    });

    console.log('✅ AWS database connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', rows.length);
    
    await connection.end();
  } catch (error) {
    console.error('❌ AWS database connection failed:', error.message);
  }
};

testConnection();