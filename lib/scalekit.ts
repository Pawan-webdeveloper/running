import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

const SCALEKIT_ENVIRONMENT_URL = process.env.EXPO_PUBLIC_SCALEKIT_ENVIRONMENT_URL;
const SCALEKIT_CLIENT_ID = process.env.EXPO_PUBLIC_SCALEKIT_CLIENT_ID;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const scheme = Linking.createURL("/");
const redirectUrl = `${API_URL}/auth/scalekit/callback`;

interface ScalekitAuthResponse {
  token: string;
  profile: any;
  is_new_user: boolean;
  error?: string;
}

export async function initiateScalekitAuth(): Promise<ScalekitAuthResponse | null> {
  try {
    if (!SCALEKIT_CLIENT_ID) {
      throw new Error("Scalekit Client ID not configured");
    }

    // Build Scalekit OAuth URL
    const authUrl = new URL(`${SCALEKIT_ENVIRONMENT_URL}/oauth/authorize`);
    authUrl.searchParams.append("client_id", SCALEKIT_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", redirectUrl);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "openid profile email");

    // Open browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      scheme,
    );

    if (result.type === "success") {
      const url = result.url;
      // Extract code from redirect URL
      const urlParams = new URL(url).searchParams;
      const code = urlParams.get("code");

      if (code) {
        // Exchange code for token on backend
        const response = await fetch(`${API_URL}/auth/scalekit/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          return { error: "Token exchange failed" } as any;
        }

        return response.json();
      }
    } else if (result.type === "dismiss") {
      return { error: "Authentication cancelled" } as any;
    }

    return { error: "Authentication failed" } as any;
  } catch (error) {
    console.error("Scalekit auth error:", error);
    return { error: "Authentication failed" } as any;
  }
}

export function isScalekitConfigured(): boolean {
  return !!(SCALEKIT_ENVIRONMENT_URL && SCALEKIT_CLIENT_ID);
}
