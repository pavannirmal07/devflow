import { useState } from "react";
import type { FormEvent } from "react";
import { Zap, Loader2, AlertCircle } from "lucide-react";

import { signIn } from "../auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:px-6 sm:py-12 bg-background text-foreground box-border overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center justify-center gap-5 sm:gap-6">
        <div className="flex items-center justify-center gap-2.5 text-center">
          <Zap className="size-7 shrink-0 text-accent" />
          <span className="font-bold text-2xl tracking-tight text-foreground">
            DevFlow
          </span>
        </div>

        <Card className="w-full shadow-lg bg-card border-border box-border p-0 gap-0">
          <CardHeader className="space-y-1.5 p-5 sm:p-6 pb-2 sm:pb-3 text-center sm:text-left">
            <CardTitle className="text-xl sm:text-2xl text-foreground">
              Welcome back
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Sign in to continue to DevFlow.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 pt-2 sm:pt-3">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-10 sm:h-11 bg-background border-border"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  minLength={6}
                  className="h-10 sm:h-11 bg-background border-border"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 sm:h-11 mt-1 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity border-none disabled:opacity-50 devflow-btn-primary"
              >
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                {loading ? "Please wait..." : "Sign in"}
              </Button>
            </form>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start sm:items-center gap-2.5 p-3 text-sm rounded-md bg-destructive/15 text-destructive border border-destructive/20"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 sm:mt-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}