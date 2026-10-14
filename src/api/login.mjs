export async function signIn({ client, storage, email, password, panel }) {
  if (!['admin', 'master'].includes(panel)) {
    throw new Error('Invalid login panel selected.');
  }

  const response = await client.post('/auth/signin', {
    email: email.trim(),
    passwordHash: password,
    scope: panel.toUpperCase(),
  }, { timeout: 15000 });

  const { token, id, email: userEmail, name, role } = response.data ?? {};
  if (typeof token !== 'string' || !token.trim() || id == null ||
      typeof userEmail !== 'string' || !userEmail.trim() ||
      !['ROLE_ADMIN', 'ROLE_MASTER'].includes(role)) {
    throw new Error('The server returned an incomplete login response. Please try again.');
  }

  if (panel === 'master' && role !== 'ROLE_MASTER') {
    throw new Error('Access denied: You do not have Master Panel privileges. Please switch to the Admin Panel tab.');
  }

  if (panel === 'admin' && role !== 'ROLE_ADMIN') {
    throw new Error('Access denied: Master Administrator credentials cannot access Tenant Admin portal. Please switch to the Master Panel tab.');
  }

  try {
    storage.setItem('user', JSON.stringify({ id, email: userEmail, name: name ?? '', role }));
    storage.setItem('token', token);
  } catch {
    // Never leave a partially saved session behind.
    try {
      storage.removeItem('token');
      storage.removeItem('user');
    } catch { /* Storage may be unavailable entirely. */ }
    throw new Error('Unable to save your login. Please allow browser storage and try again.');
  }
  return `/${panel}/dashboard`;
}

export function loginErrorMessage(error) {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The server took too long to respond. Please try again.';
  }
  if (error.isAxiosError && !error.response) {
    return 'Cannot connect to the server. Check your connection and try again.';
  }
  if (error.response?.status === 403) {
    const backendMsg = error.response?.data?.message;
    if (typeof backendMsg === 'string' && backendMsg.trim()) return backendMsg;
    return 'Access denied: You do not have permission to access this panel.';
  }
  if (error.response?.status >= 500) {
    return 'The server could not complete your login. Please try again later.';
  }
  if (error.response?.status === 401) return 'Invalid email or password.';
  const message = error.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  return error.message || 'Login failed. Please try again.';
}
