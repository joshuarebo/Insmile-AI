import { supabase } from './supabase';

let currentToken: string | null = null;
let sessionReady: Promise<void>;
let resolveSessionReady: () => void;

// Create a promise that resolves once the first session check completes
sessionReady = new Promise((resolve) => {
  resolveSessionReady = resolve;
});

// Initialize: check for existing session immediately
supabase.auth.getSession().then(({ data: { session } }) => {
  currentToken = session?.access_token ?? null;
  resolveSessionReady();
});

// Keep token in sync with auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  currentToken = session?.access_token ?? null;
  resolveSessionReady();
});

export function getToken(): string | null {
  return currentToken;
}

export async function waitForToken(): Promise<string | null> {
  await sessionReady;
  return currentToken;
}
