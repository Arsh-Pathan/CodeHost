"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useHasAuthToken } from "@/lib/client-hooks";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(() => searchParams.get("token"));
  const submittedRef = useRef(false);

  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(token ? "" : "No verification token provided.");
  const hasToken = useHasAuthToken();

  useEffect(() => {
    if (!token || submittedRef.current) {
      return;
    }
    submittedRef.current = true;

    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", "/verify-email");
    }

    fetchApi(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        if (typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem("codehost_user_cache");
            if (cached) {
              const parsed = JSON.parse(cached);
              localStorage.setItem("codehost_user_cache", JSON.stringify({ ...parsed, emailVerified: true }));
            }
          } catch {}
        }
        setStatus("success");
      })
      .catch((err: Error) => {
        setStatus("error");
        setErrorMessage(err.message || "Verification failed.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-20">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-900">
              Verifying your email...
            </h2>
            <p className="text-sm text-slate-500">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-900">
              Email verified!
            </h2>
            <p className="text-sm text-slate-500">
              Your email has been verified. You can now access all CodeHost
              features.
            </p>
            <Link
              href={hasToken ? "/dashboard" : "/login?verified=true"}
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-500 transition"
            >
              {hasToken ? "Continue to Dashboard" : "Go to Login"}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-900">
              Verification failed
            </h2>
            <p className="text-sm text-slate-500">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-500 transition"
              >
                Go to Login
              </Link>
              <p className="text-xs text-slate-400">
                You can request a new verification email from the dashboard
                after signing in.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
