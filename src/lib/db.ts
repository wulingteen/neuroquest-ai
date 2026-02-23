import postgres from 'postgres';

// Ensure required environment variables are present
const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

// Log a warning if critical config is missing
if (!dbConfig.host || !dbConfig.database || !dbConfig.username || !dbConfig.password) {
    console.warn('⚠️  Database configuration is missing. Please check your .env file.');
}

const sql = postgres({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
});

export default sql;

