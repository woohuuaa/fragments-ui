// src/App.tsx
import { useState, useEffect } from 'react';
import { Button, Card } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { signIn, signOut, getUser } from './auth';
import type { CognitoUser } from './auth';
import { createFragment, getUserFragments } from './api';
import type { FragmentMetadata } from './api';

const textFragmentType = 'text/plain';

function getViewerHref(fragment: string) {
  return '/viewer.html?fragment=' + encodeURIComponent(fragment);
}

function openViewer(fragment: string) {
  window.open(getViewerHref(fragment), '_blank');
}

function getConversionOptions(fragment: FragmentMetadata) {
  const type = fragment.type.split(';')[0];

  if (type === 'text/markdown') {
    return [{ ext: 'html', label: 'HTML' }];
  }

  return [];
}
function inferFileFragmentType(file: File) {
  if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
    return 'application/json';
  }

  if (file.name.toLowerCase().endsWith('.md')) {
    return 'text/markdown';
  }

  if (file.type.startsWith('text/')) {
    return file.type;
  }

  return '';
}

function formatUpdatedTime(updated: string) {
  const updatedDate = new Date(updated);

  if (Number.isNaN(updatedDate.getTime())) {
    return updated;
  }

  return formatDistanceToNow(updatedDate, updated);
}

function App() {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fragments, setFragments] = useState<FragmentMetadata[]>([]);
  const [textFragmentContent, setTextFragmentContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(function () {
    let active = true;

    getUser()
      .then(function (u) {
        if (active) {
          setUser(u);
        }
      })
      .catch(function (err) {
        console.error('Unable to complete login', { err });
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to complete login');
        }
      })
      .finally(function () {
        if (active) {
          setLoading(false);
        }
      });

    return function () {
      active = false;
    };
  }, []);

  async function loadFragments(currentUser = user) {
    if (!currentUser) {
      return;
    }

    try {
      setError('');
      const data = await getUserFragments(currentUser);
      setFragments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load fragments');
    }
  }

  useEffect(function () {
    if (user) {
      loadFragments(user);
    }
  }, [user]);

  async function createFragmentFromFile(file: File) {
    if (!user) {
      return;
    }

    const type = inferFileFragmentType(file);

    if (!type) {
      setError('Drop a text/* or application/json file.');
      return;
    }

    try {
      setError('');
      setMessage('Creating fragment from ' + file.name + '...');
      const content = await file.text();
      await createFragment(user, type, content);
      setMessage('Created ' + file.name + ' as ' + type + '.');
      await loadFragments(user);
    } catch (err) {
      setMessage('');
      setError(err instanceof Error ? err.message : 'Unable to create fragment from file');
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      createFragmentFromFile(file);
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file) {
      createFragmentFromFile(file);
    }
  }

  async function handleCreateTextFragment() {
    if (!user) {
      return;
    }

    if (!textFragmentContent.trim()) {
      setError('Add text content before creating a fragment.');
      return;
    }

    try {
      setError('');
      setMessage('Creating text fragment...');
      await createFragment(user, textFragmentType, textFragmentContent);
      setTextFragmentContent('');
      setMessage('Text fragment created.');
      await loadFragments(user);
    } catch (err) {
      setMessage('');
      setError(err instanceof Error ? err.message : 'Unable to create text fragment');
    }
  }

  if (loading) {
    return (
      <main className='app-shell'>
        <Card className='app-card'>
          <h1 className='app-title'>Fragments</h1>
          <p className='muted'>Loading...</p>
        </Card>
      </main>
    );
  }

  if (!user) {
    return (
      <main className='app-shell'>
        <Card className='app-card login-card'>
          <h1 className='app-title'>Fragments</h1>
          {error && <p className='status error'>{error}</p>}
          <Button onClick={signIn}>Login</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className='app-shell'>
      <Card className='app-card'>
        <h1 className='app-title'>Fragments</h1>

        <div className='button-row'>
          <Button onClick={signIn} isDisabled>
            Login
          </Button>
          <Button onClick={signOut}>Logout</Button>
        </div>

        <h2 className='welcome-title'>Welcome {user.username}!</h2>

        <section className='panel'>
          <h3 className='panel-title'>Create a Text Fragment</h3>
          <div className='text-create-row'>
            <input
              className='text-input'
              type='text'
              value={textFragmentContent}
              onChange={function (event) { setTextFragmentContent(event.target.value); }}
            />
            <Button onClick={handleCreateTextFragment}>Create Fragment</Button>
          </div>
        </section>

        <section className='panel'>
          <h3 className='panel-title'>Drag and Drop Fragment Files</h3>
          <div
            className={isDragging ? 'drop-area active' : 'drop-area'}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className='drop-content'>
              <svg className='drop-icon' viewBox='0 0 64 48' role='img' aria-label='Upload'>
                <path
                  fill='currentColor'
                  d='M48.4 20.2C46.8 10.8 38.6 4 29.1 4 21.6 4 14.8 8.3 11.5 15 4.9 16.3 0 22.1 0 29c0 7.7 6.3 14 14 14h33c9.4 0 17-7.6 17-17 0-8-5.6-14.8-13.2-16.5-.7-.2-1.5.1-2 .7-.5.6-.7 1.4-.4 2 .2.6.8 1.1 1.5 1.3C55.8 14.9 60 20 60 26c0 7.2-5.8 13-13 13H14C8.5 39 4 34.5 4 29c0-5.2 4-9.6 9.2-10 .8-.1 1.5-.6 1.8-1.3C17.5 11.9 23 8 29.1 8c7.7 0 14.2 5.5 15.5 13.1.2 1.1 1.3 1.8 2.3 1.6 1-.2 1.7-1.3 1.5-2.5ZM30 17.6 19.6 28 22.4 30.8 28 25.2V44h4V25.2l5.6 5.6L40.4 28 30 17.6Z'
                />
              </svg>
              <strong className='drop-label'>{isDragging ? 'Release to upload' : 'Drop files here...'}</strong>
              <input
                className='file-input'
                type='file'
                accept='text/*,application/json,.json,.md'
                onChange={handleFileInput}
              />
            </div>
          </div>
        </section>

        {message && <p className='status success'>{message}</p>}
        {error && <p className='status error'>{error}</p>}

        <section className='panel'>
          <h3 className='panel-title'>My Fragments</h3>
          {fragments.length === 0 ? (
            <p className='muted'>No fragments found.</p>
          ) : (
            <div className='table-wrap'>
              <table className='fragments-table'>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Updated</th>
                    <th className='numeric'>Size</th>
                    <th>Convert</th>
                  </tr>
                </thead>
                <tbody>
                  {fragments.map(function (fragment) {
                    const conversionOptions = getConversionOptions(fragment);

                    return (
                      <tr key={fragment.id}>
                        <td className='fragment-id'>
                          <button
                            className='fragment-link'
                            type='button'
                            onClick={function () { openViewer(fragment.id); }}
                          >
                            {fragment.id}
                          </button>
                        </td>
                        <td>{fragment.type}</td>
                        <td>{formatUpdatedTime(fragment.updated)}</td>
                        <td className='numeric'>{fragment.size} B</td>
                        <td className='convert-cell'>
                          {conversionOptions.length === 0 ? (
                            <span className='muted'>-</span>
                          ) : (
                            conversionOptions.map(function (option) {
                              return (
                                <button
                                  className='convert-link'
                                  key={option.ext}
                                  type='button'
                                  onClick={function () { openViewer(fragment.id + '.' + option.ext); }}
                                >
                                  {option.label}
                                </button>
                              );
                            })
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Card>
    </main>
  );
}

export default App;

function formatDistanceToNow(date: Date, fallback: string) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) {
    return fallback;
  }

  const units: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];

  for (const unit of units) {
    const value = Math.floor(seconds / unit[0]);
    if (value >= 1) {
      return value === 1 ? '1 ' + unit[1] + ' ago' : value + ' ' + unit[1] + 's ago';
    }
  }

  return 'just now';
}
