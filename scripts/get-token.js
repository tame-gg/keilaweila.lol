#!/usr/bin/env node
/**
 * One-time Spotify authorization script — manual flow (no local server).
 *
 * Run: node scripts/get-token.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET YOUR_REDIRECT_URI
 *
 * Steps:
 *  1. Set a redirect URI in your Spotify app dashboard (e.g. https://tame.gg/callback)
 *     It doesn't need to actually exist — we just need the code from the URL.
 *  2. Run this script — it opens your browser to Spotify's auth page
 *  3. Authorize the app
 *  4. Browser tries to redirect and shows an error — that's fine
 *  5. Copy the FULL URL from your address bar and paste it here
 *  6. Script exchanges the code for tokens and prints your REFRESH TOKEN
 */

const { execSync } = require('child_process');
const readline = require('readline');

const CLIENT_ID     = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI  = process.argv[4];

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.log('\nUsage: node scripts/get-token.js <CLIENT_ID> <CLIENT_SECRET> <REDIRECT_URI>\n');
  console.log('Example:');
  console.log('  node scripts/get-token.js abc123 def456 https://tame.gg/callback\n');
  console.log('The redirect URI must match exactly what you set in your Spotify app dashboard.\n');
  process.exit(1);
}

const SCOPES = 'user-read-currently-playing user-read-playback-state';

const authUrl =
  `https://accounts.spotify.com/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`;

console.log('\n🎵 Opening Spotify in your browser...\n');
try {
  execSync(`open "${authUrl}"`);
} catch {
  console.log('Could not open automatically. Visit this URL:\n');
  console.log(authUrl + '\n');
}

console.log('After you authorize, Spotify will redirect to your redirect URI.');
console.log('The page will likely fail to load — that\'s fine.');
console.log('Copy the FULL URL from your browser address bar and paste it below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the full redirect URL here: ', async (redirectedUrl) => {
  rl.close();
  try {
    const url = new URL(redirectedUrl.trim());
    const code  = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error || !code) {
      console.error('\n❌ No code found in the URL. Did you authorize the app?\n');
      process.exit(1);
    }

    console.log('\n🔄 Exchanging code for tokens...\n');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
    });

    const data = await tokenRes.json();

    if (data.error) {
      console.error('❌ Token exchange failed:', data.error_description || data.error, '\n');
      process.exit(1);
    }

    console.log('✅ Authorization successful!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Add these as Vercel Environment Variables:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`SPOTIFY_CLIENT_ID     = ${CLIENT_ID}`);
    console.log(`SPOTIFY_CLIENT_SECRET = ${CLIENT_SECRET}`);
    console.log(`SPOTIFY_REFRESH_TOKEN = ${data.refresh_token}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.error('\n❌ Failed:', err.message, '\n');
    process.exit(1);
  }
});
