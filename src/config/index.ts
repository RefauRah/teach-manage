import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export interface AppConfig {
  port: number;
  tursoDatabaseUrl: string;
  tursoAuthToken: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiryMin: number;
  jwtRefreshExpiryDays: number;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] !== undefined ? process.env[key]! : defaultValue;
}

function getEnvAsInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: AppConfig = {
  port: getEnvAsInt('PORT', 3000),
  tursoDatabaseUrl: getEnv('TURSO_DATABASE_URL', 'file:local.db'),
  tursoAuthToken: getEnv('TURSO_AUTH_TOKEN', ''),
  jwtSecret: getEnv('JWT_SECRET', 'supersecretkeychangeinproduction'),
  jwtRefreshSecret: getEnv('JWT_REFRESH_SECRET', 'anothersecretkeychangeinproduction'),
  jwtAccessExpiryMin: getEnvAsInt('JWT_ACCESS_EXPIRY_MINUTES', 60),
  jwtRefreshExpiryDays: getEnvAsInt('JWT_REFRESH_EXPIRY_DAYS', 7)
};
