<script lang="ts">
	import { onMount } from 'svelte';

	let accessToken: string | null = null;
	let player: Spotify.Player | null = null;
	let currentTrack: Spotify.Track | null = null;
	let isPlaying = false;
	let playlists: Spotify.Playlist[] = [];
	let selectedPlaylist: Spotify.Playlist | null = null;
	let tracks: Spotify.Track[] = [];
	let deviceId: string | null = null;
	let volume = 0.5;
	let progress = 0; // ความคืบหน้าของเพลง (ใน milliseconds)

	// ฟังก์ชันสำหรับตรวจสอบว่า token มีค่าหรือไม่
	const checkTokenExpiry = (token: string): boolean => {
		return !!token; // ตรวจสอบแค่ว่า token มีค่าหรือไม่
	};

	// ฟังก์ชันสำหรับโหลด Spotify Web Playback SDK
	const loadSpotifySDK = () => {
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

	// ฟังก์ชันสำหรับเริ่มต้น Spotify Player
	const initializePlayer = async () => {
		console.log('🎧 Initializing Spotify Player...');
		await loadSpotifySDK();
		if (accessToken) {
			player = new Spotify.Player({
				name: 'Svelte Spotify Player',
				getOAuthToken: (cb) => cb(accessToken ?? ''),
				volume: volume,
			});

			player.addListener('ready', ({ device_id }) => {
				console.log('✅ Ready with Device ID:', device_id);
				deviceId = device_id;
				transferPlayback(device_id);
			});

			player.addListener('player_state_changed', (state) => {
				if (state) {
					currentTrack = state.track_window.current_track;
					isPlaying = !state.paused;
					progress = state.position; // อัปเดตความคืบหน้าของเพลง
					console.log('🎵 Current Track:', currentTrack);
				}
			});

			await player.connect();
		}
	};

	// ฟังก์ชันสำหรับโอนการเล่นไปยังอุปกรณ์นี้
	const transferPlayback = async (device_id: string) => {
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

	// ฟังก์ชันสำหรับโหลด Playlist ของผู้ใช้
	const fetchPlaylists = async () => {
		try {
			const response = await fetch('https://api.spotify.com/v1/me/playlists', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				playlists = data.items;
				console.log('📚 Playlists loaded:', playlists);
			} else {
				console.error('❌ Error fetching playlists:', await response.json());
			}
		} catch (error) {
			console.error('❌ Network error:', error);
		}
	};

	// ฟังก์ชันสำหรับโหลดเพลงใน Playlist ที่เลือก
	const fetchTracks = async (playlistId: string) => {
		try {
			const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				tracks = data.items.map((item: any) => item.track);
				console.log('🎵 Tracks loaded:', tracks);
			} else {
				console.error('❌ Error fetching tracks:', await response.json());
			}
		} catch (error) {
			console.error('❌ Network error:', error);
		}
	};

	// ฟังก์ชันสำหรับเล่นเพลง
	const playTrack = async (trackUri: string) => {
		if (player && deviceId) {
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
		}
	};

	// ฟังก์ชันสำหรับปรับระดับเสียง
	const setVolume = async (newVolume: number) => {
		if (player) {
			await player.setVolume(newVolume);
			volume = newVolume;
			console.log('🔊 Volume set to:', newVolume);
		}
	};

	// ฟังก์ชันสำหรับข้ามหรือย้อนกลับเพลง
	const skipTrack = async (direction: 'next' | 'previous') => {
		if (player && deviceId) {
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
		}
	};

	// ฟังก์ชันสำหรับปรับเวลาเพลง (Seek)
	const seekTrack = async (positionMs: number) => {
		if (player && deviceId) {
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
		}
	};

	onMount(async () => {
		accessToken = localStorage.getItem('spotify_access_token');
		if (!accessToken || !checkTokenExpiry(accessToken)) {
			localStorage.removeItem('spotify_access_token');
			if (!window.location.hash.includes('access_token')) {
				const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
				const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
				const scope =
					'streaming user-read-private user-read-email user-modify-playback-state user-read-playback-state playlist-read-private';
				window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
					redirectUri
				)}&scope=${encodeURIComponent(scope)}`;
			}
		} else {
			try {
				await initializePlayer();
				await fetchPlaylists();
			} catch (e) {
				console.error('❌ Error initializing player:', e);
			}
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
				<p>Progress: {Math.floor(progress / 1000)}s</p>
				<input type="range" min="0" max={currentTrack.duration_ms} bind:value={progress} on:change={() => seekTrack(progress)} />
				<button on:click={() => skipTrack('previous')}>⏮️ Previous</button>
				<button on:click={() => player?.togglePlay()}>{isPlaying ? '⏸️ Pause' : '▶️ Play'}</button>
				<button on:click={() => skipTrack('next')}>⏭️ Next</button>
				<input type="range" min="0" max="1" step="0.01" bind:value={volume} on:change={() => setVolume(volume)} />
			</div>
		{/if}

		<h2>Your Playlists</h2>
		<ul>
			{#each playlists as playlist}
				<li>
					<button on:click={() => { selectedPlaylist = playlist; fetchTracks(playlist.id); }}>
						{playlist.name}
					</button>
				</li>
			{/each}
		</ul>

		{#if selectedPlaylist}
			<h2>Tracks in {selectedPlaylist.name}</h2>
			<ul>
				{#each tracks as track}
					<li>
						<button on:click={() => playTrack(track.uri)}>
							{track.name} - {track.artists.map((artist) => artist.name).join(', ')}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<h1>Loading...</h1>
	{/if}
</main>