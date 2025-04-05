// This is a development-only authentication helper
// It provides a fallback when Firebase Google auth is not configured

import { doc, setDoc } from "firebase/firestore"
import { db } from "./firebase"

export const devSignInWithGoogle = async (email: string, displayName: string) => {
  // This is only for development purposes
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development authentication is not available in production")
  }

  // Generate a deterministic user ID based on email for development
  const uid = `dev-${Buffer.from(email).toString("hex")}`

  // Check if this is the admin email
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // Create or update the user document
  await setDoc(doc(db, "users", uid), {
    displayName,
    email,
    isAdmin,
    createdAt: new Date(),
  })

  // Return the user object
  return {
    uid,
    email,
    displayName,
    isAdmin,
  }
}

