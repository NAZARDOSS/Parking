import app from './server/app.js';
import { validateRuntimeEnv } from './server/config/env.js';

validateRuntimeEnv();

export default app;
