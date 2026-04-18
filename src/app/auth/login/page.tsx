"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup } from "firebase/auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Sign in with Google Popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // 2. Get Firebase ID Token
      const idToken = await user.getIdToken();

      // 3. Send token to backend to create session cookie
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create session");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-scoop/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-48 w-96 h-96 bg-scoop-light/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome to SharedScoop
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to start saving on protein supplements
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-secondary hover:bg-accent rounded-xl text-sm font-medium text-foreground transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {error && (
              <p className="text-sm text-destructive text-center mt-2">{error}</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
