"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/layout";
import GoogleSignInButton from "@/components/google-sign-in-button";

export default function Register() {
  const [error, setError] = useState("");
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
      router.push("/preferences");
    } catch (err: any) {
      // Display the specific error message
      setError(err.message || "Failed to sign in with Google");

      // If it's the configuration error, provide more helpful information
      if (err.message && err.message.includes("not properly configured")) {
        setError(
          `${err.message} This is a configuration issue that needs to be fixed by the administrator.`
        );
      }
    }
  };

  return (
    <Layout>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            アカウントを作成
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div>
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              text="Googleで登録"
            />
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-semibold leading-6 text-gray-900 hover:text-gray-700"
            >
              こちらからログイン
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
