// src/App.tsx
import { useState, useEffect } from 'react';
import { Button, Card, Flex, Heading } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { signIn, signOut, getUser, CognitoUser } from './auth';
import { getUserFragments } from './api';

function App() {

  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);

  // See if we're signed in (i.e., we'll have a `user` object)
  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Do an authenticated request to the fragments API server and log the result
  useEffect(() => {
    if (user) {
      getUserFragments(user);
      // TODO: later in the course, we will show all the user's fragments in the HTML...
    }
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <Card>
        <Heading level={1}>Fragments UI</Heading>
        {/* Sign-in via the Amazon Cognito Hosted UI (requires redirects) */}
        <Button onClick={signIn}>Login</Button>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="1rem">
        <Heading level={1}>Fragments UI</Heading>
        {/* Update the UI to welcome the user */}
        {/* Show the user's username */}
        <Heading level={2}>Welcome {user.username}!</Heading>
        {/* Disable the Login button */}
        <Button onClick={() => signIn()} isDisabled>
          Login
        </Button>
        <Button onClick={signOut}>Logout</Button>
      </Flex>
    </Card>
  );
}

export default App;