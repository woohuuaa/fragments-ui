// src/auth.ts
import { UserManager, User } from 'oidc-client-ts';

export interface CognitoUser {
  username: string;
  email: string;
  idToken: string;
  accessToken: string;
  authorizationHeaders: (type?: string) => Record<string, string>;
}

const cognitoAuthConfig = {
  authority: `https://cognito-idp.us-east-2.amazonaws.com/${import.meta.env.VITE_AWS_COGNITO_POOL_ID!}`,
  client_id: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID!,
  redirect_uri: import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL!,
  response_type: 'code',
  scope: 'phone openid email',
  // no revoke of "access token" (https://github.com/authts/oidc-client-ts/issues/262)
  revokeTokenTypes: ['refresh_token'] as ("refresh_token" | "access_token")[],
  // no silent renew via "prompt=none" (https://github.com/authts/oidc-client-ts/issues/366)
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

export async function signIn(): Promise<void> {
  // Trigger a redirect to the Cognito auth page, so user can authenticate
  await userManager.signinRedirect();
}

export async function signOut(): Promise<void> {
  const clientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID!;
  const poolId = import.meta.env.VITE_AWS_COGNITO_POOL_ID!;
  const logoutUri = import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL!;
  // Get the Cognito domain from the User Pool ID
  const region = poolId.split('_')[0];
  const cognitoDomain = `https://${poolId.replace('_', '')}.auth.${region}.amazoncognito.com`;
  
  // Clear the stored user session before redirecting
  await userManager.removeUser();

  // Directly redirect to Cognito's logout endpoint instead of using
  // signoutRedirect(), which may fail to find the end_session_endpoint
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

// Create a simplified view of the user, with an extra method for creating
// authorization headers
function formatUser(user: User): CognitoUser {
  console.log('User Authenticated', { user });
  return {
    // If you add any other profile scopes, you can include them here
    username: user.profile['cognito:username'] as string,
    email: user.profile.email ?? '',
    idToken: user.id_token ?? '',
    accessToken: user.access_token ?? '',
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

export async function getUser(): Promise<CognitoUser | null> {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    const user = await userManager.signinCallback();
    if (!user) return null;
    // Remove the auth code from the URL without triggering a reload
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }
  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}