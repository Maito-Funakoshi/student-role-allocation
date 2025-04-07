"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DevLoginForm() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Generate a deterministic user ID based on email for development
      const uid = `dev-${Buffer.from(email).toString("hex")}`

      // Check if this is the admin email
      const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

      // Create or update the user document
      await setDoc(doc(db, "users", uid), {
        displayName: name,
        email,
        isAdmin,
        createdAt: new Date(),
      })

      setSuccess(`Development login successful! You are now logged in as ${name} (${email}). Redirecting...`)

      // Store the dev user in localStorage for session simulation
      localStorage.setItem(
        "devUser",
        JSON.stringify({
          uid,
          email,
          displayName: name,
          isAdmin,
        }),
      )

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/preferences")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to perform development login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
      <h3 className="text-lg font-medium text-yellow-800 mb-2">Development Login</h3>
      <p className="text-sm text-yellow-700 mb-4">
        This is a development-only login form that bypasses Firebase Authentication. Use this when testing in
        environments where Firebase Authentication is not fully configured.
      </p>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">{success}</div>
      )}

      <form onSubmit={handleDevLogin} className="space-y-4">
        <div>
          <label htmlFor="dev-name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="dev-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="dev-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
          />
          {process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
            <p className="mt-1 text-xs text-gray-500">Admin email: {process.env.NEXT_PUBLIC_ADMIN_EMAIL}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          {loading ? "Processing..." : "Development Login"}
        </button>
      </form>
    </div>
  )
}
