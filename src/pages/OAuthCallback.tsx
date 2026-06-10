import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

/**
 * Minimal OAuth callback page. The BrowserOAuthClient processes the
 * authorization code from the URL during client.init() in AuthContext.
 * This page simply shows a loader and redirects to "/" — the AuthContext
 * detects the /oauth/callback path and auto-opens the admin modal.
 */
const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Give AuthContext a tick to pick up the callback, then navigate home.
    // The AuthContext init already handles session creation from the URL params.
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <Loader label="Signing in…" />;
};

export default OAuthCallback;
