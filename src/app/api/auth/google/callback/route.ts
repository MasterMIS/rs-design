import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const tokens = await getTokens(code);
    
    // Display the refresh token to the user
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
          <h1>Authorization Successful!</h1>
          <p>Please copy the <b>refresh_token</b> below and add it to your <code>.env.local</code> file as <code>GOOGLE_REFRESH_TOKEN</code>.</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; word-break: break-all; font-family: monospace; border: 1px solid #ccc;">
            ${tokens.refresh_token || 'No refresh token received. You might have already authorized. Try revoking access or using "prompt: consent" in auth URL.'}
          </div>
          <p style="margin-top: 20px;">After adding it to <code>.env.local</code>, restart your dev server.</p>
          <a href="/users" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Back to Users Page</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
