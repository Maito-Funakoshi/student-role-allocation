"use client";

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { getAdminEmails } from "./database";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const defaultContext: AuthContextType = {
  user: null,
  loading: true,
  signInWithGoogle: async () => { },
  signOut: async () => { },
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({
  children,
}: AuthProviderProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();

        // Get admin emails from database
        const dbAdminEmails = await getAdminEmails();

        // Check if user is admin from env or database
        const isEnvAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.split(",").includes(
          firebaseUser.email || ""
        ) ?? false;

        const isDbAdmin = dbAdminEmails.includes(firebaseUser.email || "");

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: userData?.displayName || firebaseUser.displayName || "",
          isAdmin: userData?.isAdmin || isEnvAdmin || isDbAdmin,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Configure Google provider with custom parameters for better compatibility
      googleProvider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get admin emails from database
      const dbAdminEmails = await getAdminEmails();

      // Check if this is the admin email from env or database
      const isEnvAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.split(",").includes(
        user.email || ""
      ) ?? false;

      const isDbAdmin = dbAdminEmails.includes(user.email || "");
      const isAdmin = isEnvAdmin || isDbAdmin;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(doc(db, "users", user.uid), {
          displayName: user.displayName,
          email: user.email,
          isAdmin,
          createdAt: new Date(),
        });
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);

      // Handle specific Firebase authentication errors
      switch (error.code) {
        case "auth/popup-closed-by-user":
          throw new Error(
            "ログインがキャンセルされました。もう一度お試しください。"
          );
        case "auth/popup-blocked":
          throw new Error(
            "ポップアップがブロックされました。ブラウザの設定を確認してください。"
          );
        case "auth/cancelled-popup-request":
          throw new Error(
            "認証プロセスがキャンセルされました。もう一度お試しください。"
          );
        case "auth/unauthorized-domain":
          const domain = window.location.hostname;
          throw new Error(
            `このドメイン(${domain})は認証が許可されていません。Firebase Consoleで承認済みドメインに追加してください。`
          );
        case "auth/operation-not-allowed":
          throw new Error(
            "Google認証が有効になっていません。Firebase Consoleで設定を確認してください。"
          );
        default:
          throw new Error(
            "認証中にエラーが発生しました。もう一度お試しください。"
          );
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
