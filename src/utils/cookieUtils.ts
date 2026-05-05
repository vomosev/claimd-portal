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
