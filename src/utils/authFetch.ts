import { auth } from '../firebase';

/**
 * Performs a fetch request to CNTEstates backend APIs with the verified
 * Firebase Auth ID token attached as an Authorization Bearer header.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  const currentUser = auth.currentUser;

  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${idToken}`);
    } catch {
      // Proceed without token; server will reject protected endpoints with 401
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
