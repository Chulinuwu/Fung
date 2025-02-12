<script lang="ts">
  import { onMount } from 'svelte';

  let accessToken: string | null = null;
  let player: Spotify.Player | null = null;
  let currentTrack: Spotify.Track | null = null;
  let isPlaying = false;

  // ฟังก์ชันสำหรับเริ่มต้น Spotify Player
  const initializePlayer = () => {
    if (accessToken) {
      player = new Spotify.Player({
        name: 'Svelte Spotify Player',
        getOAuthToken: (cb) => cb(accessToken || ''),
        volume: 0.5,
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      });

      player.addListener('player_state_changed', (state) => {
        if (state) {
          currentTrack = state.track_window.current_track;
          isPlaying = !state.paused;
        }
      });

      player.connect();
    }
  };

  // ฟังก์ชันสำหรับเล่นเพลง
  const playTrack = async (trackUri: string) => {
    if (accessToken) {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${player?._options.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      });
    }
  };

  // ฟังก์ชันสำหรับหยุดเพลง
  const pauseTrack = async () => {
    if (accessToken) {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${player?._options.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  };

  // ฟังก์ชันสำหรับข้ามไปเพลงถัดไป
  const skipToNextTrack = async () => {
    if (accessToken) {
      await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${player?._options.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  };

  // ฟังก์ชันสำหรับย้อนกลับไปเพลงก่อนหน้า
  const skipToPreviousTrack = async () => {
    if (accessToken) {
      await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${player?._options.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  };

  onMount(() => {
    accessToken = localStorage.getItem('spotify_access_token');

    if (!accessToken) {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
      const scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state';

      window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${encodeURIComponent(scope)}`;
    } else {
      initializePlayer();
    }
  });
</script>

<main>
  {#if accessToken}
    <h1>Welcome to Spotify App</h1>

    {#if currentTrack}
      <div>
        <h2>Now Playing</h2>
        <img src={currentTrack.album.images[0].url} alt={currentTrack.name} width="200" />
        <p>{currentTrack.name} - {currentTrack.artists.map((artist) => artist.name).join(', ')}</p>
      </div>
    {/if}

    <div>
      <button on:click={() => skipToPreviousTrack()}>Previous</button>
      {#if isPlaying}
        <button on:click={() => pauseTrack()}>Pause</button>
      {:else}
        <button on:click={() => playTrack('spotify:track:4iV5W9uYEdYUVa79Axb7Rh')}>Play</button>
      {/if}
      <button on:click={() => skipToNextTrack()}>Next</button>
    </div>
  {:else}
    <h1>Loading...</h1>
  {/if}
</main>