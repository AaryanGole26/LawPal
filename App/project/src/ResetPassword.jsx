import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

const MIN_PASSWORD_LENGTH = 8;

// Landing page for the link in Supabase's password recovery email, which signs
// the user in with a temporary recovery session.
function ResetPassword() {
  const [hasSession, setHasSession] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setHasSession(Boolean(data.session)))
      .catch(() => setHasSession(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white px-4 py-20">
      <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur-lg bg-white/10 shadow-xl border border-white/20">
        <h1 className="text-3xl font-bold mb-6 text-center">Set a new password</h1>
        {hasSession === false ? (
          <p className="text-center text-gray-300">
            This reset link is invalid or has expired.{" "}
            <Link to="/login" className="underline text-purple-300">
              Back to login
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p role="alert" className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</p>}
            <label htmlFor="new-password" className="block text-sm">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving || hasSession === null}
              className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
