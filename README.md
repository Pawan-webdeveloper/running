# Runzilla 🏃‍♂️

Runzilla is a mobile application built with React Native (Expo) and a Node.js/Express backend. It uses **ScaleKit** for authentication and **Supabase** for the database.

To run this project locally, you **must** run both the backend server and the frontend app simultaneously.

---

## 🛠 Prerequisites

Before you start, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- An Android Emulator, iOS Simulator, or physical device connected
- A ScaleKit account and project
- A Supabase project (for the database)
- An Upstash Redis database

---

## ⚙️ Step 1: Environment Setup

You need to configure **two** `.env` files: one in the root folder and one in the `backend` folder.

### 1. Root `.env` (Frontend)
Create a `.env` file in the root directory (`/Users/pawan/Development/runzilla/.env`) with the following variables:
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Redis
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Expo App Config
EXPO_PROJECT_ID=
EXPO_PUBLIC_API_URL=http://localhost:3000

# ScaleKit Public Keys
EXPO_PUBLIC_SCALEKIT_ENVIRONMENT_URL=https://time.scalekit.dev
EXPO_PUBLIC_SCALEKIT_CLIENT_ID=your_scalekit_client_id
```

### 2. Backend `.env`
Create a `.env` file in the backend directory (`/Users/pawan/Development/runzilla/backend/.env`) with the following variables:
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Redis
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# App Config
EXPO_PROJECT_ID=
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_APP_SCHEME=runzilla

# ScaleKit Secrets
SCALEKIT_ENVIRONMENT_URL=https://time.scalekit.dev
SCALEKIT_CLIENT_ID=your_scalekit_client_id
SCALEKIT_CLIENT_SECRET=your_scalekit_secret_key
SCALEKIT_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Server
NODE_ENV=development
PORT=3000
TZ=Asia/Kolkata
ADMIN_JWT_SECRET=your_jwt_secret
ADMIN_EMAILS=admin@runzilla.com
```

> **Important:** Make sure `SCALEKIT_REDIRECT_URI` exactly matches the Redirect URI configured in your ScaleKit Dashboard!

---

## 📦 Step 2: Install Dependencies

You must install dependencies for both the frontend and the backend.

Open your terminal and run:

**1. Root dependencies:**
```bash
cd /Users/pawan/Development/runzilla
npm install
```

**2. Backend dependencies:**
```bash
cd /Users/pawan/Development/runzilla/backend
npm install
```

---

## 🚀 Step 3: Start the Backend Server (Terminal 1)

The mobile app relies heavily on the backend API (for auth, profiles, runs, etc.). **The backend must be running first.**

Open a new terminal window:
```bash
cd /Users/pawan/Development/runzilla/backend
npm run dev
```
Wait for the terminal to display that the server is running on `http://localhost:3000`. Leave this terminal open.

---

## 📱 Step 4: Start the Expo App (Terminal 2)

Once the backend is running, open a **second terminal window** to start the frontend app.

```bash
cd /Users/pawan/Development/runzilla

# For Android Emulator:
npx expo run:android

# For iOS Simulator:
npx expo run:ios
```

**Note on Android Emulators:**
If you are running the app on an Android emulator, `localhost` refers to the emulator itself, not your computer. Our code automatically rewrites `localhost:3000` to `10.0.2.2:3000` for Android so it can connect to your local backend correctly.

---

## 🛑 Troubleshooting Common Issues

### 1. Network Request Failed (`[Error: Request failed]`)
If your Expo app crashes with a network error on startup, it means **it cannot reach the backend server**.
- Make sure `npm run dev` is actively running in the `backend` folder.
- If testing on a physical device, `localhost` won't work. You must change `EXPO_PUBLIC_API_URL` to your computer's local IP address (e.g., `http://192.168.1.5:3000`) in **both** `.env` files and restart the backend and frontend.

### 2. Login Redirect Fails
If ScaleKit login works in the browser but doesn't redirect back to the app:
- Verify that `EXPO_APP_SCHEME=runzilla` is correctly set.
- Make sure your ScaleKit dashboard has `http://localhost:3000/api/auth/callback` added as an authorized Redirect URL.

### 3. Typescript Errors on Backend
If the backend fails to compile, verify that the `@runzilla/shared` package is correctly resolving. It might be necessary to run `npm install` in the root workspace.
