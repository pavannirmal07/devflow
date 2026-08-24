// Supabase Edge Function: github-integration
// Secure GitHub API proxy and GitHub App installation flow

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<number, TokenCacheEntry>();

// Convert PKCS#1 RSA Private Key DER to PKCS#8 PrivateKeyInfo DER
function pkcs1ToPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const rsaOid = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);

  function encodeLength(len: number): number[] {
    if (len < 128) {
      return [len];
    }
    const bytes: number[] = [];
    let temp = len;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    return [0x80 | bytes.length, ...bytes];
  }

  const octetHeader = new Uint8Array([0x04, ...encodeLength(pkcs1Der.length)]);
  const innerLength = version.length + rsaOid.length + octetHeader.length + pkcs1Der.length;
  const seqHeader = new Uint8Array([0x30, ...encodeLength(innerLength)]);

  const pkcs8Der = new Uint8Array(seqHeader.length + innerLength);
  let offset = 0;
  pkcs8Der.set(seqHeader, offset); offset += seqHeader.length;
  pkcs8Der.set(version, offset); offset += version.length;
  pkcs8Der.set(rsaOid, offset); offset += rsaOid.length;
  pkcs8Der.set(octetHeader, offset); offset += octetHeader.length;
  pkcs8Der.set(pkcs1Der, offset);

  return pkcs8Der;
}

// Robustly import RSA Private Key from PEM (supports both PKCS#1 and PKCS#8, escaped newlines, quotes)
async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  let clean = privateKeyPem.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  clean = clean.replace(/\\n/g, "\n");

  const isExplicitPkcs1 = clean.includes("BEGIN RSA PRIVATE KEY");

  const base64Body = clean
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(base64Body), (c) => c.charCodeAt(0));

  if (isExplicitPkcs1) {
    const pkcs8Der = pkcs1ToPkcs8(binaryDer);
    return await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Der as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch (_err) {
    // Fallback: convert as PKCS#1
    const pkcs8Der = pkcs1ToPkcs8(binaryDer);
    return await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Der as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
}

// Generate GitHub App JWT from RS256 Private Key
async function generateAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60 seconds in the past to account for clock drift
    exp: now + 600, // 10 minutes maximum validity
    iss: appId,
  };

  const cryptoKey = await importPrivateKey(privateKeyPem);

  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const message = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, message);

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Get or create installation access token
async function getInstallationAccessToken(
  appId: string,
  privateKeyPem: string,
  installationId: number
): Promise<string> {
  const cached = tokenCache.get(installationId);
  const now = Date.now();

  if (cached && cached.expiresAt > now + 60000) {
    return cached.token;
  }

  const appJwt = await generateAppJwt(appId, privateKeyPem);

  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevFlow-App",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const token = data.token;
  const expiresAt = new Date(data.expires_at).getTime();

  tokenCache.set(installationId, { token, expiresAt });
  return token;
}

// Fetch GitHub App metadata using App JWT
async function getGitHubAppMetadata(appId: string, privateKeyPem: string) {
  const appJwt = await generateAppJwt(appId, privateKeyPem);
  const res = await fetch("https://api.github.com/app", {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevFlow-App",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch GitHub App info (${res.status}): ${errText}`);
  }

  return await res.json();
}

// Fetch details for a specific installation from GitHub App API
async function getInstallationDetails(appId: string, privateKeyPem: string, installationId: number) {
  const appJwt = await generateAppJwt(appId, privateKeyPem);
  const res = await fetch(`https://api.github.com/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevFlow-App",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub installation not found or inaccessible (${res.status}): ${errText}`);
  }

  return await res.json();
}

// Fetch all installations accessible to this GitHub App
async function listAllAppInstallations(appId: string, privateKeyPem: string) {
  const appJwt = await generateAppJwt(appId, privateKeyPem);
  const res = await fetch("https://api.github.com/app/installations?per_page=100", {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevFlow-App",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list GitHub App installations (${res.status}): ${errText}`);
  }

  return await res.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized Supabase user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appId = Deno.env.get("GITHUB_APP_ID");
    const privateKeyPem = Deno.env.get("GITHUB_APP_PRIVATE_KEY");

    console.log("GitHub private key diagnostic:", {
      appId,
      exists: Boolean(privateKeyPem),
      length: privateKeyPem?.length ?? 0,
      hasRsaHeader: privateKeyPem?.includes("-----BEGIN RSA PRIVATE KEY-----") ?? false,
      hasPkcs8Header: privateKeyPem?.includes("-----BEGIN PRIVATE KEY-----") ?? false,
      hasRsaFooter: privateKeyPem?.includes("-----END RSA PRIVATE KEY-----") ?? false,
      hasPkcs8Footer: privateKeyPem?.includes("-----END PRIVATE KEY-----") ?? false,
    });

    if (!appId || !privateKeyPem) {
      return new Response(
        JSON.stringify({
          error: "GitHub App credentials not configured on server",
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const installationIdParam = url.searchParams.get("installation_id");
    const owner = url.searchParams.get("owner");
    const repo = url.searchParams.get("repo");
    const sha = url.searchParams.get("sha");

    // =========================================================================
    // Action 1: get_install_url — returns GitHub App installation URL
    // =========================================================================
    if (action === "get_install_url" || action === "install") {
      const appData = await getGitHubAppMetadata(appId, privateKeyPem);
      const appSlug = appData.slug || Deno.env.get("GITHUB_APP_SLUG") || "devflow";
      const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

      return new Response(
        JSON.stringify({
          data: {
            install_url: installUrl,
            app_slug: appSlug,
            app_name: appData.name || "DevFlow",
            app_id: appId,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Action 2: list_app_installations — lists installations created on GitHub
    // =========================================================================
    if (action === "app_installations") {
      const installationsList = await listAllAppInstallations(appId, privateKeyPem);
      const formatted = Array.isArray(installationsList)
        ? installationsList.map((inst: {
            id: number;
            account: { login: string; type: string; avatar_url?: string };
          }) => ({
            installation_id: inst.id,
            account_login: inst.account?.login || "Unknown",
            account_type: inst.account?.type || "User",
            account_avatar_url: inst.account?.avatar_url || null,
          }))
        : [];

      return new Response(
        JSON.stringify({ data: { installations: formatted } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Action 3: connect_installation — links a real GitHub installation to user
    // =========================================================================
    if (action === "connect_installation") {
      if (!installationIdParam) {
        return new Response(
          JSON.stringify({ error: "Missing installation_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const instId = parseInt(installationIdParam, 10);
      if (isNaN(instId) || instId <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid installation_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify installation validity directly from GitHub App API
      const instData = await getInstallationDetails(appId, privateKeyPem, instId);

      const accountLogin = instData.account?.login || "Unknown";
      const accountType = instData.account?.type || "User";
      const accountAvatarUrl = instData.account?.avatar_url || null;

      // Upsert into public.github_installations using the user's authenticated session
      const { data: savedRecord, error: saveErr } = await supabase
        .from("github_installations")
        .upsert(
          {
            user_id: user.id,
            installation_id: instId,
            account_login: accountLogin,
            account_type: accountType,
            account_avatar_url: accountAvatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,installation_id" }
        )
        .select()
        .single();

      if (saveErr) {
        return new Response(
          JSON.stringify({ error: `Failed to save installation: ${saveErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: { installation: savedRecord } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Repositories, Branches, PRs, Commits — requires installation verification
    // =========================================================================
    if (!installationIdParam) {
      return new Response(
        JSON.stringify({ error: "Missing installation_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const installationId = parseInt(installationIdParam, 10);

    // Verify user ownership of this installation record in Supabase
    const { data: installationRecord, error: instError } = await supabase
      .from("github_installations")
      .select("id, user_id, installation_id")
      .eq("user_id", user.id)
      .eq("installation_id", installationId)
      .maybeSingle();

    if (instError || !installationRecord) {
      return new Response(
        JSON.stringify({ error: "GitHub installation not found or unauthorized for this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtain scoped token
    const token = await getInstallationAccessToken(appId, privateKeyPem, installationId);
    const githubHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "DevFlow-App",
    };

    let targetUrl = "";

    switch (action) {
      case "repositories":
        targetUrl = "https://api.github.com/installation/repositories?per_page=100";
        break;

      case "branches":
        if (!owner || !repo) {
          return new Response(
            JSON.stringify({ error: "owner and repo parameters required for branches" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetUrl = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`;
        break;

      case "pulls":
        if (!owner || !repo) {
          return new Response(
            JSON.stringify({ error: "owner and repo parameters required for pulls" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=50`;
        break;

      case "commits":
        if (!owner || !repo) {
          return new Response(
            JSON.stringify({ error: "owner and repo parameters required for commits" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30${sha ? `&sha=${encodeURIComponent(sha)}` : ""}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const githubRes = await fetch(targetUrl, { headers: githubHeaders });

    if (!githubRes.ok) {
      const errBody = await githubRes.text();
      return new Response(
        JSON.stringify({
          error: `GitHub API error (${githubRes.status})`,
          status: githubRes.status,
          details: errBody,
        }),
        { status: githubRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubData = await githubRes.json();

    return new Response(JSON.stringify({ data: githubData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal Edge Function error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
