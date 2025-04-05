# Fixing the "auth/unauthorized-domain" Error in Firebase Authentication

When you encounter the "auth/unauthorized-domain" error, it means you're trying to use Firebase Authentication from a domain that isn't authorized in your Firebase project. This is a security feature to prevent unauthorized domains from using your Firebase authentication.

## How to Fix the Error

### 1. Add Your Domain to Firebase Authorized Domains

1. Go to the [Firebase Console](https://console.firebase.google.com/) and select your project
2. Navigate to **Authentication** in the left sidebar
3. Click on the **Settings** tab
4. Scroll down to the **Authorized domains** section
5. Click **Add domain**
6. Add your domain (e.g., `localhost`, `your-app.vercel.app`, `your-custom-domain.com`)
7. Click **Add**

### 2. Common Domains to Add

- For local development: `localhost`
- For Vercel preview deployments: `*.vercel.app`
- For your production domain: `yourdomain.com`

### 3. Wait for Changes to Propagate

After adding a domain, it may take a few minutes for the changes to propagate through Firebase's systems.

## Using the Development Login

If you're working in a development or preview environment where you can't easily add the domain to Firebase (such as temporary Vercel preview URLs), you can use the development login option:

1. Click the "Show development login options" link at the bottom of the login page
2. Fill in your name and email
3. Click "Development Login"

This will create a simulated user session that works within the current browser, allowing you to test the application without needing to configure Firebase Authentication for every preview domain.

> **Note**: The development login is only intended for testing and development purposes. It should not be used in production.

## Additional Troubleshooting

If you're still encountering issues:

1. Make sure you've added the exact domain you're using (check for typos)
2. Check if you're using HTTPS in production but added an HTTP domain (or vice versa)
3. Clear your browser cache and cookies
4. Try using a different browser
5. Check the Firebase Authentication logs in the Firebase Console for more details

For more information, refer to the [Firebase Authentication documentation](https://firebase.google.com/docs/auth).

