// src/auth.ts
import { UserManager, User } from 'oidc-client-ts';

export interface CognitoUser {
  username: string;
  email: string;
  idToken: string;
  accessToken: string;
  authorizationHeaders: (type?: string) => Record<string, string>;
}

const poolId = import.meta.env.VITE_AWS_COGNITO_POOL_ID;
const clientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID;
const redirectUri = import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL;

const cognitoAuthConfig = {
  authority: 'https://cognito-idp.us-east-2.amazonaws.com/' + poolId,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'phone openid email',
  // no revoke of access token (https://github.com/authts/oidc-client-ts/issues/262)
  revokeTokenTypes: ['refresh_token'] as ('refresh_token' | 'access_token')[],
  // no silent renew via prompt=none (https://github.com/authts/oidc-client-ts/issues/366)
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

function clearSigninCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export async function signIn(): Promise<void> {
  // Trigger a redirect to the Cognito auth page, so user can authenticate
  await userManager.signinRedirect();
}

export async function signOut(): Promise<void> {
  const region = poolId.split('_')[0];
  const cognitoDomain = 'https://' + poolId.replace('_', '') + '.auth.' + region + '.amazoncognito.com';

  // Clear the stored user session before redirecting
  await userManager.removeUser();

  // Directly redirect to Cognito's logout endpoint instead of using
  // signoutRedirect(), which may fail to find the end_session_endpoint
  window.location.href = cognitoDomain + '/logout?client_id=' + clientId + '&logout_uri=' + encodeURIComponent(redirectUri);
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
      Authorization: 'Bearer ' + user.id_token,
    }),
  };
}

export async function getUser(): Promise<CognitoUser | null> {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
    try {
      const user = await userManager.signinCallback();
      clearSigninCallbackUrl();
      return user ? formatUser(user) : null;
    } catch (err) {
      console.error('Unable to complete signin callback', { err });
      clearSigninCallbackUrl();
      return null;
    }
  }

  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}
