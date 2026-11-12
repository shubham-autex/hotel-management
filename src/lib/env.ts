export function env(name: string): string | undefined {
  return process.env[name];
}

export function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}
