"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/layout";
import GoogleSignInButton from "@/components/google-sign-in-button";
import DevLoginForm from "@/components/dev-login-form";

export default function Login() {
  const [error, setError] = useState("");
  const [showDevLogin, setShowDevLogin] = useState(false);
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
      router.push("/preferences");
      router.refresh();
    } catch (err: any) {
      setError(err.message);

      // 開発環境でのフォールバック処理
      if (
        process.env.NODE_ENV === "development" &&
        err.message.includes("認証が許可されていません")
      ) {
        setShowDevLogin(true);
      }
    }
  };

  return (
    <Layout>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            アカウントにログイン
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
              text="Googleでログイン"
            />
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/register"
              className="font-semibold leading-6 text-gray-900 hover:text-gray-700"
            >
              こちらから登録
            </Link>
          </p>

          {showDevLogin && <DevLoginForm />}

          {!showDevLogin && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowDevLogin(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                開発者用ログインオプションを表示
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
