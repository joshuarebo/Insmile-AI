import { supabase } from './supabase';

let currentToken: string | null = null;
let tokenResolvers: Array<(token: string | null) => void> = [];
let initialized = false;

function notifyWaiters() {
  if (currentToken && tokenResolvers.length > 0) {
    tokenResolvers.forEach((resolve) => resolve(currentToken));
    tokenResolvers = [];
  }
}

// Initialize: check for existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  currentToken = session?.access_token ?? null;
  initialized = true;
  notifyWaiters();
});

// Keep token in sync with auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  currentToken = session?.access_token ?? null;
  initialized = true;
  notifyWaiters();
});

export function getToken(): string | null {
  return currentToken;
}

export async function waitForToken(): Promise<string | null> {
  // If we already have a token, return immediately
  if (currentToken) return currentToken;

  // If already initialized but no token, user isn't logged in
  if (initialized) return null;

  // Wait for either a token to arrive or a timeout (3s)
  return new Promise((resolve) => {
    tokenResolvers.push(resolve);
    setTimeout(() => {
      resolve(currentToken);
    }, 3000);
  });
}
