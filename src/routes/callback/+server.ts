import { json, redirect } from '@sveltejs/kit';

export async function GET({ cookies , url }) {
  const accessToken = cookies.get('spotify_access_token');

  // ถ้ามี access token ใน cookie, รีไดเรกต์ไปหน้า '/'
  if (accessToken) {
    throw redirect(302, '/'); // รีไดเรกต์ผู้ใช้ไปที่หน้า '/'
  }

  // ถ้ายังไม่มี access token, ดึง code จาก query
  const code = url.searchParams.get('code');
  if (!code) {
    throw new Error('Missing code parameter');
  }

  try {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch access token from Spotify:', errorText);
      throw new Error('Failed to fetch access token from Spotify');
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // เก็บ access_token ใน cookie
    cookies.set('spotify_access_token', accessToken, {
      httpOnly: true, // ป้องกันการเข้าถึง cookie ผ่าน JavaScript
      secure: process.env.NODE_ENV === 'production', // ใช้ secure cookie ใน production
      maxAge: 3600, // ระยะเวลาในหน่วยวินาที (1 ชั่วโมง)
      path: '/' // ใช้ cookie สำหรับทุก path
    });

    // รีไดเรกต์ผู้ใช้ไปยังหน้า '/'
    throw redirect(302, '/');
  } catch (error) {
    console.error('Error during callback processing:', error);
    throw new Error('Internal Server Error');
  }
}
