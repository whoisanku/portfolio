export const OAUTH_CALLBACK_PATH = "/oauth/callback";

const OPEN_ADMIN_MODAL_KEY = "open-admin-modal";
const AUTH_RETURN_PATH_KEY = "admin-auth-return-path";

const getSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isSafeReturnPath = (path: string) =>
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !path.startsWith(OAUTH_CALLBACK_PATH);

export const isOAuthCallbackPath = () => window.location.pathname === OAUTH_CALLBACK_PATH;

export const currentAuthReturnPath = () => {
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return isSafeReturnPath(path) ? path : "/";
};

export const rememberAuthReturnPath = () => {
  getSessionStorage()?.setItem(AUTH_RETURN_PATH_KEY, currentAuthReturnPath());
};

export const readAuthReturnPath = (fallback = "/") => {
  const path = getSessionStorage()?.getItem(AUTH_RETURN_PATH_KEY);
  return path && isSafeReturnPath(path) ? path : fallback;
};

export const clearAuthReturnPath = () => {
  getSessionStorage()?.removeItem(AUTH_RETURN_PATH_KEY);
};

export const hasPendingAdminAuth = () =>
  getSessionStorage()?.getItem(OPEN_ADMIN_MODAL_KEY) === "1";

export const markPendingAdminAuth = () => {
  getSessionStorage()?.setItem(OPEN_ADMIN_MODAL_KEY, "1");
};

export const clearPendingAdminAuth = () => {
  getSessionStorage()?.removeItem(OPEN_ADMIN_MODAL_KEY);
};
