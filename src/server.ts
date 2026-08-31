import { createApp } from './app.js';
import { config } from './config/index.js';

async function startServer() {
  try {
    const app = await createApp();
    const port = config.port;

    app.listen(port, () => {
      console.log(`Teaching Management System running on http://localhost:${port}`);
      console.log(`Turso / SQLite Database: ${config.tursoDatabaseUrl}`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();
