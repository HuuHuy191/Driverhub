const sql = require('mssql');

const database = process.env.DB_DATABASE;
if (!database || !/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('DB_DATABASE must contain only letters, numbers, or underscores');
}

const poolConfig = {
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 1433),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'master',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
  },
  connectionTimeout: 5000,
};

async function connectWithRetry() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const pool = new sql.ConnectionPool(poolConfig);
    try {
      await pool.connect();
      return pool;
    } catch {
      await pool.close().catch(() => undefined);
      if (attempt === 60) {
        throw new Error('Could not connect to SQL Server after 60 attempts');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function main() {
  const pool = await connectWithRetry();
  try {
    const result = await pool
      .request()
      .input('databaseName', sql.NVarChar, database)
      .query(`
        IF DB_ID(@databaseName) IS NULL
        BEGIN
          EXEC(N'CREATE DATABASE [${database}] COLLATE Vietnamese_CI_AS')
          SELECT CAST(1 AS bit) AS created
        END
        ELSE
          SELECT CAST(0 AS bit) AS created
      `);

    const created = result.recordset[0].created;
    console.log(created ? 'created' : 'existing');
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error('Docker database initialization failed:', error.message);
  process.exitCode = 1;
});
