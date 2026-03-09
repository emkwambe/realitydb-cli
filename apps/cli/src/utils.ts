export function maskConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return connectionString.replace(/:([^@/]+)@/, ':****@');
  }
}
