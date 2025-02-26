// filepath: /C:/Users/ananz/Fung/src/routes/spotify.ts
export const checkTokenExpiry = (token: string): boolean => {
    return !!token;
  };
  
  export const loadSpotifySDK = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.Spotify) {
        resolve();
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          if (window.Spotify) {
            resolve();
          } else {
            reject(new Error('Spotify SDK not available'));
          }
        };
  
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        script.onload = () => {
          if (!window.Spotify) {
            reject(new Error('Spotify SDK failed to load'));
          }
        };
        script.onerror = () => {
          reject(new Error('Failed to load Spotify SDK'));
        };
        document.body.appendChild(script);
      }
    });
  };
  
  export const initializePlayer = async (accessToken: string, volume: number, transferPlayback: (device_id: string) => void) => {
    console.log('🎧 Initializing Spotify Player...');
    await loadSpotifySDK();
    if (accessToken) {
      const player = new Spotify.Player({
        name: 'FUNG',
        getOAuthToken: (cb) => cb(accessToken ?? ''),
        volume: volume,
      });
  
      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Ready with Device ID:', device_id);
        transferPlayback(device_id);
      });
  
      player.addListener('player_state_changed', (state) => {
        if (state) {
          console.log('🎵 Current Track:', state.track_window.current_track);
        }
      });
  
      await player.connect();
      return player;
    }
    return null;
  };
  
  export const transferPlayback = async (accessToken: string, device_id: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [device_id], play: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error transferring playback:', errorData);
        if (response.status === 403) {
          console.error('❌ Token may be expired or missing required scopes.');
        }
      } else {
        console.log('🎶 Playback transferred successfully!');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };
  
  export const fetchPlaylists = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📚 Playlists loaded:', data.items);
        return data.items;
      } else {
        console.error('❌ Error fetching playlists:', await response.json());
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
    return [];
  };
  
  export const fetchTracks = async (accessToken: string, playlistId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Tracks loaded:', data.items.map((item: any) => item.track));
        return data.items.map((item: any) => item.track);
      } else {
        console.error('❌ Error fetching tracks:', await response.json());
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
    return [];
  };
  
  export const playTrack = async (accessToken: string, deviceId: string, trackUri: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      });
      if (!response.ok) {
        console.error('❌ Error playing track:', await response.json());
      } else {
        console.log('🎶 Playing track:', trackUri);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };
  
  export const setVolume = async (player: Spotify.Player, newVolume: number) => {
    await player.setVolume(newVolume);
    console.log('🔊 Volume set to:', newVolume);
  };
  
  export const skipTrack = async (accessToken: string, deviceId: string, direction: 'next' | 'previous') => {
    try {
      const endpoint = direction === 'next' ? 'next' : 'previous';
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${deviceId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        console.error(`❌ Error skipping ${direction} track:`, await response.json());
      } else {
        console.log(`⏭️ Skipped ${direction} track`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };
  
  export const seekTrack = async (accessToken: string, deviceId: string, positionMs: number) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        console.error('❌ Error seeking track:', await response.json());
      } else {
        console.log('⏩ Seeked to:', positionMs);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };
  
  export const fetchRecentlyPlayed = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=5', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.items.map((item: any) => item.track);
      }
    } catch (error) {
      console.error('❌ Error fetching recently played:', error);
    }
    return [];
  };
  
  export const fetchTopArtists = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.items;
      }
    } catch (error) {
      console.error('❌ Error fetching top artists:', error);
    }
    return [];
  };