// src/api.ts
// fragments microservice API to use, defaults to localhost:8080 if not set in env
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface FragmentMetadata {
  id: string;
  ownerId: string;
  created: string;
  updated: string;
  type: string;
  size: number;
}

interface FragmentsUser {
  authorizationHeaders: (type?: string) => Record<string, string>;
}

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice. We ask for expanded results so the API returns all
 * metadata for each fragment.
 */
export async function getUserFragments(user: FragmentsUser): Promise<FragmentMetadata[]> {
  console.log('Requesting user fragments data...');

  const fragmentsUrl = new URL('/v1/fragments', apiUrl);
  fragmentsUrl.searchParams.set('expand', '1');

  const res = await fetch(fragmentsUrl, {
    headers: user.authorizationHeaders(),
  });

  if (!res.ok) {
    throw new Error(res.status + ' ' + res.statusText);
  }

  const data = await res.json();
  console.log('Successfully got user fragments data', { data });

  return data.fragments || [];
}

export async function getFragmentContent(user: FragmentsUser, idOrPath: string): Promise<string> {
  console.log('Requesting fragment content...', { idOrPath });

  const fragmentUrl = new URL('/v1/fragments/' + idOrPath, apiUrl);
  const res = await fetch(fragmentUrl, {
    headers: user.authorizationHeaders(),
  });

  if (!res.ok) {
    throw new Error(res.status + ' ' + res.statusText);
  }

  return res.text();
}

export async function createFragment(user: FragmentsUser, type: string, content: string) {
  console.log('Creating fragment...', { type });

  const fragmentsUrl = new URL('/v1/fragments', apiUrl);
  const res = await fetch(fragmentsUrl, {
    method: 'POST',
    headers: user.authorizationHeaders(type),
    body: content,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || res.status + ' ' + res.statusText);
  }

  const data = await res.json();
  console.log('Successfully created fragment', { data });

  return data;
}
