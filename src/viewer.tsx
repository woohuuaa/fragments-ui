import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { getUser } from './auth';
import { getFragmentContent } from './api';
import type { CognitoUser } from './auth';

function getFragmentParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('fragment') || '';
}

function Viewer() {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const fragment = getFragmentParam();

  useEffect(function () {
    getUser()
      .then(function (u) {
        setUser(u);
      })
      .catch(function (err) {
        setError(err instanceof Error ? err.message : 'Unable to load user');
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);

  useEffect(function () {
    if (!user || !fragment) {
      return;
    }

    getFragmentContent(user, fragment)
      .then(function (data) {
        setContent(data);
      })
      .catch(function (err) {
        setError(err instanceof Error ? err.message : 'Unable to load fragment');
      });
  }, [user, fragment]);

  if (loading) {
    return <pre>Loading...</pre>;
  }

  if (!fragment) {
    return <pre>Missing fragment query parameter.</pre>;
  }

  if (!user) {
    return <pre>Not signed in. Open this viewer from the logged-in Fragments page.</pre>;
  }

  if (error) {
    return <pre>{error}</pre>;
  }

  return <pre>{content}</pre>;
}

createRoot(document.getElementById('root')!).render(<Viewer />);
