import app from '../backend/server/app.js';
import { validateRuntimeEnv } from '../backend/server/config/env.js';

validateRuntimeEnv();

export default app;
