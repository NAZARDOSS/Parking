import app from './app.js';
import { env, validateRuntimeEnv } from './config/env.js';
import { verifyDatabaseConnection } from './config/db.js';

validateRuntimeEnv();

verifyDatabaseConnection()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

export default app;
