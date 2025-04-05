# Setting Up Google Authentication in Firebase

This guide will help you properly configure Google Authentication for your Firebase project to resolve the "auth/configuration-not-found" error.

## Step 1: Configure Authentication in Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/) and select your project
2. Navigate to **Authentication** in the left sidebar
3. Click on the **Sign-in method** tab
4. Find **Google** in the list of providers and click on it
5. Toggle the **Enable** switch to the on position
6. Enter your project's support email (usually your email)
7. Click **Save**

## Step 2: Configure OAuth Consent Screen (if using Google Cloud Platform)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the same project that's linked to your Firebase project
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Select the appropriate user type (External or Internal)
5. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
6. Click **Save and Continue**
7. Add any necessary scopes (email and profile are usually sufficient)
8. Click **Save and Continue**
9. Add test users if needed
10. Click **Save and Continue**

## Step 3: Configure Authorized Domains

1. Go back to the Firebase Console > Authentication
2. Click on the **Settings** tab
3. Scroll down to the **Authorized domains** section
4. Make sure your app's domain is listed (for local development, localhost should be there by default)
5. If needed, add your production domain

## Step 4: Get Web Client ID and Secret (if needed)

1. In the Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Look for the Web Client ID that was automatically created by Firebase
3. If you need to create a new one, click **Create Credentials** > **OAuth client ID**
4. Select **Web application** as the application type
5. Add authorized JavaScript origins (e.g., `http://localhost:3000` for development)
6. Add authorized redirect URIs (e.g., `http://localhost:3000/login`)
7. Click **Create**

## Troubleshooting

If you're still encountering the "auth/configuration-not-found" error:

1. Make sure you've completed all the steps above
2. Verify that you're using the correct Firebase project
3. Check if there are any restrictions on your Google Cloud project
4. Try clearing your browser cache and cookies
5. Ensure your Firebase configuration in the app matches the project where you've enabled Google authentication

For local development, you may need to use a different authentication method or create a development-specific Firebase project with less restrictive settings.

