import { useState } from "react";
import type { FormEvent } from "react";
import { signIn, signUp } from "../auth";

type AuthMode = "login" | "signup";

export function AuthPage() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setMessage("");

        if (mode === "signup" && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            if (mode === "login") {
                const { error } = await signIn(email, password);

                if (error) {
                    setError(error.message);
                    return;
                }

                setMessage("Signed in successfully.");
            } else {
                const { data, error } = await signUp(email, password);

                if (error) {
                    setError(error.message);
                    return;
                }

                if (data.session) {
                    setMessage("Account created successfully.");
                } else {
                    setMessage(
                        "Account created. Please check your email to confirm your account."
                    );
                }
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function switchMode() {
        setMode(mode === "login" ? "signup" : "login");
        setError("");
        setMessage("");
        setPassword("");
        setConfirmPassword("");
    }

    return (
        <main>
            <h1>DevFlow</h1>

            {mode === "login" ? (
                <>
                    <h2>Welcome back</h2>
                    <p>Sign in to continue to DevFlow.</p>
                </>
            ) : (
                <>
                    <h2>Create account</h2>
                    <p>Create your DevFlow account.</p>
                </>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={6}
                        required
                    />
                </div>

                {mode === "signup" && (
                    <div>
                        <label htmlFor="confirm-password">Confirm password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            minLength={6}
                            required
                        />
                    </div>
                )}

                <button type="submit" disabled={loading}>
                    {loading
                        ? "Please wait..."
                        : mode === "login"
                            ? "Sign in"
                            : "Sign up"}
                </button>
            </form>

            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}

            <p>
                {mode === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                <button type="button" onClick={switchMode}>
                    {mode === "login" ? "Sign up" : "Sign in"}
                </button>
            </p>
        </main>
    );
}