type SupabaseConfig = {
  url: string;
  serviceKey: string;
};

const getSupabaseUrl = () => {
  const direct = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  if (direct) return direct;
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) return null;
  try {
    const host = new URL(databaseUrl).hostname;
    const match = host.match(/db\.([^.]+)\.supabase\.co/);
    if (!match) return null;
    return `https://${match[1]}.supabase.co`;
  } catch {
    return null;
  }
};

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = getSupabaseUrl();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE;
  if (!url || !serviceKey) {
    throw new Error('Supabase credentials are missing');
  }
  return { url, serviceKey };
};

export const buildSupabaseHeaders = (serviceKey: string) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
});

export const supabaseFetch = async (
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  } = {}
) => {
  const { url, serviceKey } = getSupabaseConfig();
  const requestUrl = new URL(`${url}/rest/v1/${path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        requestUrl.searchParams.set(key, value);
      }
    });
  }
  const response = await fetch(requestUrl.toString(), {
    method: options.method || 'GET',
    headers: {
      ...buildSupabaseHeaders(serviceKey),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${path} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
};
