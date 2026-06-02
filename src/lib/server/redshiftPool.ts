import 'server-only';

import { Pool } from 'pg';

type RedshiftPoolOptions = {
  globalKey: string;
  userEnv?: string;
  passwordEnv?: string;
  defaultUser?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var redshiftPools: Record<string, Pool | undefined> | undefined;
}

export const getRedshiftPool = ({
  globalKey,
  userEnv = 'REDSHIFT_USER',
  passwordEnv = 'REDSHIFT_PASSWORD',
  defaultUser,
  max = 10,
  idleTimeoutMillis = 30000,
  connectionTimeoutMillis = 10000,
}: RedshiftPoolOptions) => {
  const host = process.env.REDSHIFT_HOST;
  const user = process.env[userEnv];
  const password = process.env[passwordEnv];

  if (!host) throw new Error('Missing required env var: REDSHIFT_HOST');
  if (!user && !defaultUser) throw new Error(`Missing required env var: ${userEnv}`);
  if (!password) throw new Error(`Missing required env var: ${passwordEnv}`);

  const poolConfig = {
    host,
    user: user || defaultUser,
    password,
    database: process.env.REDSHIFT_DATABASE || 'biredshiftdb',
    port: parseInt(process.env.REDSHIFT_PORT || '5439', 10),
    ssl: { rejectUnauthorized: false },
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  };

  if (process.env.NODE_ENV !== 'production') {
    globalThis.redshiftPools ??= {};
    globalThis.redshiftPools[globalKey] ??= new Pool(poolConfig);
    return globalThis.redshiftPools[globalKey] as Pool;
  }

  return new Pool(poolConfig);
};
