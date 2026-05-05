Here's the converted TypeScript utility that can be used across your TSX components:

## Cookie Utility File (`utils/cookieUtils.ts`)

```typescript
// Generate UUID v4
export function generateUUID(): string {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // use high-precision timer if available
  }
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

// Set cookie with expiration
export function setCookie(name: string, value: string, hours: number = 4): void {
  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + (hours * 60 * 60 * 1000));
  const expires = `expires=${expirationDate.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;secure;SameSite=Strict`;
}

// Get cookie by name
export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Delete cookie
export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure`;
}

// Check if cookie exists and is valid
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

// Set PAYGNEW cookie with UUID
export function setPaygNewCookie(): string {
  const uuid = generateUUID();
  setCookie('PAYGNEW', uuid, 4);
  return uuid;
}

// Set PAYGSET cookie with username
export function setUsernameCookie(username: string): void {
  setCookie('PAYGSET', username, 4);
}

// Get username from cookie
export function getUsernameFromCookie(): string | null {
  return getCookie('PAYGSET');
}

// Check if user has valid session cookies
export function hasValidSession(): boolean {
  return hasCookie('PAYGNEW') && hasCookie('PAYGSET');
}

// Get session info
export function getSessionInfo(): { uuid: string | null; username: string | null; isValid: boolean } {
  const uuid = getCookie('PAYGNEW');
  const username = getCookie('PAYGSET');
  return {
    uuid,
    username,
    isValid: uuid !== null && username !== null
  };
}

// Clear all session cookies
export function clearSessionCookies(): void {
  deleteCookie('PAYGNEW');
  deleteCookie('PAYGSET');
}
```

## Usage in SignIn/SignUp Component

```typescript
// SignIn.tsx or SignUp.tsx
import React, { useState } from 'react';
import { setPaygNewCookie, setUsernameCookie } from '@/utils/cookieUtils';

const SignIn: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Your authentication logic here
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        // Set cookies after successful authentication
        setPaygNewCookie(); // Creates UUID cookie
        setUsernameCookie(username); // Sets username cookie
        
        // Redirect or update UI
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  );
};

export default SignIn;
```

## Usage in AwardDetailsPage.tsx

```typescript
// AwardDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { hasValidSession, getSessionInfo, getUsernameFromCookie, clearSessionCookies } from '@/utils/cookieUtils';

const AwardDetailsPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has valid cookies on component mount
    const sessionInfo = getSessionInfo();
    
    if (sessionInfo.isValid) {
      setIsAuthenticated(true);
      setCurrentUser(sessionInfo.username);
    } else {
      setIsAuthenticated(false);
      // Optionally redirect to login
      // window.location.href = '/signin';
    }
  }, []);

  const handleSignOut = () => {
    clearSessionCookies();
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.href = '/signin';
  };

  if (!isAuthenticated) {
    return (
      <div>
        <p>Please sign in to view award details.</p>
        <a href="/signin">Sign In</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Award Details</h1>
      <p>Welcome, {currentUser}!</p>
      <button onClick={handleSignOut}>Sign Out</button>
      {/* Your award details content */}
    </div>
  );
};

export default AwardDetailsPage;
```

## Alternative: Using React Hook

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { getSessionInfo, clearSessionCookies } from '@/utils/cookieUtils';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [uuid, setUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionInfo = getSessionInfo();
    setIsAuthenticated(sessionInfo.isValid);
    setUsername(sessionInfo.username);
    setUuid(sessionInfo.uuid);
    setLoading(false);
  }, []);

  const signOut = () => {
    clearSessionCookies();
    setIsAuthenticated(false);
    setUsername(null);
    setUuid(null);
  };

  return {
    isAuthenticated,
    username,
    uuid,
    loading,
    signOut
  };
}
```

## Usage with Hook

```typescript
// AwardDetailsPage.tsx with hook
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const AwardDetailsPage: React.FC = () => {
  const { isAuthenticated, username, loading, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>Please sign in to view award details.</p>
        <a href="/signin">Sign In</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Award Details</h1>
      <p>Welcome, {username}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

export default AwardDetailsPage;
```

This provides a complete, type-safe solution for cookie management across your React/TypeScript application!
