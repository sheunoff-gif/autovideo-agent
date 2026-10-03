export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(
      `Erreur TikTok : ${error_description || error}`
    );
  }

  if (!code || !state) {
    return res.status(400).send("Paramètres TikTok manquants.");
  }

  const cookies = req.headers.cookie || "";
  const savedState = cookies
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("tiktok_state="))
    ?.split("=")[1];

  if (!savedState || savedState !== state) {
    return res.status(400).send("Erreur de sécurité : état invalide.");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    return res.status(500).send(
      "TikTok n'est pas encore configuré sur le serveur."
    );
  }

  const tokenResponse = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    return res.status(400).send(
      "Impossible de terminer la connexion TikTok."
    );
  }

  const userResponse = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    }
  );

  const userData = await userResponse.json();

  if (!userResponse.ok) {
    return res.status(400).send(
      "Connexion TikTok réussie, mais impossible de récupérer le compte."
    );
  }

  const displayName =
    userData?.data?.user?.display_name || "votre compte TikTok";

  return res.status(200).send(`
    <!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Connexion réussie</title>
    </head>
    <body style="font-family:Arial,sans-serif;padding:40px;text-align:center">
      <h1>Connexion TikTok réussie ✅</h1>
      <p>Compte connecté : <strong>${displayName}</strong></p>
      <p>AutoVideo Agent est maintenant connecté à TikTok.</p>
    </body>
    </html>
  `);
}