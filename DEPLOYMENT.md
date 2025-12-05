# Deploying EduShare Connect to Render

Since your application uses **Socket.io** for real-time chat, **Render** is the best free platform for deployment. Netlify does not support the persistent connections required for chat.

## Prerequisites

1.  **GitHub Account**: Ensure your code is pushed to a GitHub repository.
2.  **Render Account**: Sign up at [render.com](https://render.com).
3.  **MongoDB Atlas**: Your database is already on Atlas, which is perfect.

## Step 1: Prepare MongoDB

1.  Log in to **MongoDB Atlas**.
2.  Go to **Network Access** in the sidebar.
3.  Click **Add IP Address**.
4.  Select **Allow Access from Anywhere** (`0.0.0.0/0`).
    - *Note: This is required because Render's IP addresses change dynamically.*
5.  Click **Confirm**.

## Step 2: Create Web Service on Render

1.  Log in to your **Render Dashboard**.
2.  Click **New +** and select **Web Service**.
3.  Connect your **GitHub repository**.
4.  Configure the service:
    - **Name**: `edushare-connect` (or any unique name)
    - **Region**: Choose the one closest to you (e.g., Singapore, Frankfurt).
    - **Branch**: `main` (or `master`).
    - **Root Directory**: Leave blank.
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node app.js`
    - **Instance Type**: `Free`

## Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section and add the following keys from your `.env` file:

| Key | Value |
| :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://sabab:sabab123@edushare.algemj3.mongodb.net/edushare?appName=edushare` |
| `SESSION_SECRET` | `your-super-secret-session-key-here` (or generate a new random string) |
| `CLOUDINARY_CLOUD_NAME` | `dzypxcb9n` |
| `CLOUDINARY_API_KEY` | `195424153753248` |
| `CLOUDINARY_API_SECRET` | `ifzkMnVCi6O4MGgb0Uhvt6BhX2E` |
| `OPENROUTER_API_KEY` | `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` |
| `NODE_ENV` | `production` |

> [!IMPORTANT]
> Do NOT copy the `PORT` variable. Render sets this automatically.

## Step 4: Deploy

1.  Click **Create Web Service**.
2.  Render will start building your app. You can watch the logs.
3.  Once the build finishes, you will see a green **Live** badge.
4.  Your app will be available at `https://edushare-connect.onrender.com` (or similar).

## Troubleshooting

- **Build Failed?** Check the logs. Ensure `npm install` ran successfully.
- **Deploy Failed?** Check if `node app.js` started without errors.
- **Chat not working?** Ensure you are using `https` (Render forces HTTPS, which is good).
