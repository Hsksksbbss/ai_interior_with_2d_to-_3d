import axios from 'axios';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const apiBaseUrl = (configuredBaseUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${apiBaseUrl}/${path.replace(/^\/+/, '')}`;
}

export function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `Unable to reach the backend at ${apiBaseUrl}. Start FastAPI on port 8000 or configure NEXT_PUBLIC_API_BASE_URL.`;
    }
    const detail = error.response.data?.detail ?? error.response.data?.message;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
