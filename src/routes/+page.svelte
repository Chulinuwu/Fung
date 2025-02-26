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
	let progress = 0;
	let activeTab = 'home';
	let recentlyPlayed: string | any[] = [];
	let topArtists: any[] = [];
	let showVolumeSlider = false;

	// ฟังก์ชันสำหรับตรวจสอบว่า token มีค่าหรือไม่
	const checkTokenExpiry = (token: string): boolean => {
		return !!token;
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
				name: 'FUNG',
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
					progress = state.position;
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

	// ฟังก์ชันโหลดเพลงที่เล่นล่าสุด
	const fetchRecentlyPlayed = async () => {
		try {
			const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=5', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				recentlyPlayed = data.items.map((item: any) => item.track);
			}
		} catch (error) {
			console.error('❌ Error fetching recently played:', error);
		}
	};

	// ฟังก์ชันโหลดศิลปินยอดนิยม
	const fetchTopArtists = async () => {
		try {
			const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				topArtists = data.items;
			}
		} catch (error) {
			console.error('❌ Error fetching top artists:', error);
		}
	};

	// ฟังก์ชันเปลี่ยน tab
	const changeTab = (tab: string) => {
		activeTab = tab;
		if (tab === 'home') {
			fetchRecentlyPlayed();
			fetchTopArtists();
		} else if (tab === 'browse') {
			// อาจจะมีการโหลดข้อมูลเพิ่มเติมสำหรับหน้า browse
		} else if (tab === 'radio') {
			// อาจจะมีการโหลดข้อมูลเพิ่มเติมสำหรับหน้า radio
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
					'streaming user-read-private user-read-email user-modify-playback-state user-read-playback-state playlist-read-private user-top-read user-read-recently-played';
				window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
					redirectUri
				)}&scope=${encodeURIComponent(scope)}`;
			} else {
				// Extract token from URL hash
				const hash = window.location.hash.substring(1);
				const params = new URLSearchParams(hash);
				accessToken = params.get('access_token');
				if (accessToken) {
					localStorage.setItem('spotify_access_token', accessToken);
					window.location.hash = '';
				}
			}
		}

		if (accessToken) {
			try {
				await initializePlayer();
				await fetchPlaylists();
				await fetchRecentlyPlayed();
				await fetchTopArtists();
			} catch (e) {
				console.error('❌ Error initializing player:', e);
			}
		}
	});

	// Format track duration
	const formatTime = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
	};
</script>

<div class="min-h-screen max-w-screen bg-gradient-to-br from-purple-100 via-pink-100 to-pink-200 font-sans">
	<!-- Sidebar -->
	<div class="flex max-w-screen ">
		<div class="w-64 min-h-screen bg-pink-50 shadow-md flex flex-col p-4 fixed left-0 top-0 z-10">
			<div class="flex items-center mb-8">
				<h1 class="text-2xl font-bold text-pink-500">FUNG</h1>
				<div class="ml-auto">
					<div class="flex bg-pink-100 rounded-full p-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input type="text" placeholder="Search..." class="bg-transparent border-none focus:outline-none text-sm ml-2 w-24 text-pink-700" />
					</div>
				</div>
			</div>

			<!-- Navigation Menu -->
			<nav class="mb-8 mt-4 ">
				<ul class="space-y-3">
					<li>
						<button
							class="flex items-center w-full p-2 rounded-lg {activeTab === 'home' ? 'bg-pink-200 text-pink-600' : 'text-pink-400 hover:bg-pink-100'}"
							on:click={() => changeTab('home')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
							</svg>
							HOME
						</button>
					</li>
					<li>
						<button
							class="flex items-center w-full p-2 rounded-lg {activeTab === 'browse' ? 'bg-pink-200 text-pink-600' : 'text-pink-400 hover:bg-pink-100'}"
							on:click={() => changeTab('browse')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							BROWSE
						</button>
					</li>
					<li>
						<button
							class="flex items-center w-full p-2 rounded-lg {activeTab === 'radio' ? 'bg-pink-200 text-pink-600' : 'text-pink-400 hover:bg-pink-100'}"
							on:click={() => changeTab('radio')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
							</svg>
							RADIO
						</button>
					</li>
				</ul>
			</nav>

			<div class="mt-2">
				<h3 class="uppercase text-xs font-bold text-pink-300 tracking-wider mb-3">YOUR LIBRARY</h3>
				<ul class="space-y-3">
					<li>
						<button class="flex items-center w-full p-2 rounded-lg text-pink-400 hover:bg-pink-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							RECENTLY PLAYED
						</button>
					</li>
					<li>
						<button class="flex items-center w-full p-2 rounded-lg text-pink-400 hover:bg-pink-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
							FAVORITE SONGS
						</button>
					</li>
					<li>
						<button class="flex items-center w-full p-2 rounded-lg text-pink-400 hover:bg-pink-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							ARTISTS
						</button>
					</li>
					<li>
						<button class="flex items-center w-full p-2 rounded-lg text-pink-400 hover:bg-pink-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
							ALBUMS
						</button>
					</li>
				</ul>
			</div>

			<div class="mt-8">
				<h3 class="uppercase text-xs font-bold text-pink-300 tracking-wider mb-3">PLAYLISTS</h3>
				<ul class="space-y-2 overflow-y-auto max-h-32">
					{#each playlists as playlist}
						<li>
							<button
								class="flex items-center w-full p-2 rounded-lg text-pink-500 hover:bg-pink-100 text-sm truncate"
								on:click={() => { selectedPlaylist = playlist; fetchTracks(playlist.id); }}
							>
								{playlist.name}
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-auto mb-6">
				<button class="flex items-center w-full p-2 rounded-lg text-pink-400 hover:bg-pink-100 border border-pink-200">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					NEW PLAYLIST
				</button>
			</div>
		</div>

		<!-- Main Content -->
		<div class="ml-64 flex-grow p-6 max-w-screen">
			{#if accessToken}
				{#if activeTab === 'home'}
					<div class="mb-8  max-w-screen">
						{#if currentTrack && currentTrack.album && currentTrack.album.images && currentTrack.album.images.length > 0}
							<div class="rounded-2xl w-full max-w-screen overflow-hidden mb-8 shadow-lg bg-gradient-to-r from-pink-300 to-purple-300 p-6 flex items-center">
								<div class="w-48 h-48 mr-8">
									<img src={currentTrack.album.images[0].url} alt={currentTrack.name} class="w-full h-full object-cover rounded-xl shadow-md" />
								</div>
								<div class="flex flex-col">
									<h2 class="text-3xl font-bold text-white mb-2">{currentTrack.name}</h2>
									<p class="text-lg text-pink-100 mb-4">{currentTrack.artists.map((artist) => artist.name).join(', ')}</p>
									<p class="text-sm text-pink-100 mb-1">Album: {currentTrack.album.name}</p>
									<div class="flex items-center mt-4">
										<button
											class="bg-white text-pink-500 rounded-full p-2 mr-4 hover:bg-pink-100 transition-colors shadow-md"
											on:click={() => skipTrack('previous')}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
											</svg>
										</button>
										<button
											class="bg-white text-pink-500 rounded-full p-3 mr-4 hover:bg-pink-100 transition-colors shadow-md"
											on:click={() => player?.togglePlay()}
										>
											{#if isPlaying}
												<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											{:else}
												<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											{/if}
										</button>
										<button
											class="bg-white text-pink-500 rounded-full p-2 mr-4 hover:bg-pink-100 transition-colors shadow-md"
											on:click={() => skipTrack('next')}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
										</button>
										
									</div>
								</div>
							</div>
						{/if}


						<h2 class="text-2xl font-bold text-pink-600 mb-4">Featured Playlists</h2>
						<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
							{#each playlists.slice(0, 5) as playlist}
								<div
									class="bg-white p-4 rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer overflow-hidden"
									on:click={() => { selectedPlaylist = playlist; fetchTracks(playlist.id); }}
								>
									{#if playlist.images && playlist.images.length > 0}
										<img src={playlist.images[0].url} alt={playlist.name} class="w-full h-40 object-cover rounded-lg shadow-sm mb-3" />
									{:else}
										<div class="w-full h-40 bg-pink-200 rounded-lg shadow-sm mb-3 flex items-center justify-center">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M919c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
											</svg>
										</div>
									{/if}
									<h3 class="font-medium text-pink-600 text-sm">{playlist.name}</h3>
									<p class="text-xs text-pink-400 mt-1">By {playlist.owner?.display_name || 'Unknown'}</p>
								</div>
							{/each}
						</div>

						<div class="mt-10">
							<h2 class="text-2xl font-bold text-pink-600 mb-4">Recently Played</h2>
							<div class="bg-white rounded-xl shadow-md p-4">
								{#if recentlyPlayed.length > 0}
									<ul class="divide-y divide-pink-100">
										{#each recentlyPlayed as track}
											<li class="py-3 flex items-center hover:bg-pink-50 rounded-lg px-2 cursor-pointer" on:click={() => playTrack(track.uri)}>
												{#if track.album && track.album.images && track.album.images.length > 0}
													<img src={track.album.images[track.album.images.length - 1].url} alt={track.name} class="w-12 h-12 rounded-md shadow-sm mr-4" />
												{:else}
													<div class="w-12 h-12 bg-pink-200 rounded-md shadow-sm mr-4 flex items-center justify-center">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
														</svg>
													</div>
												{/if}
												<div>
													<h3 class="font-medium text-pink-600">{track.name}</h3>
													<p class="text-xs text-pink-400">{track.artists.map((artist: { name: any; }) => artist.name).join(', ')}</p>
												</div>
												<div class="ml-auto text-xs text-pink-300">{formatTime(track.duration_ms)}</div>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-pink-400 text-center py-4">No recently played tracks found.</p>
								{/if}
							</div>
						</div>

						<div class="mt-10">
							<h2 class="text-2xl font-bold text-pink-600 mb-4">Your Top Artists</h2>
							<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
								{#each topArtists as artist, i}
									<div class="bg-white p-4 rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer overflow-hidden">
										{#if artist.images && artist.images.length > 0}
											<img src={artist.images[0].url} alt={artist.name} class="w-full h-40 object-cover rounded-full shadow-sm mb-3" />
										{:else}
											<div class="w-full h-40 bg-pink-200 rounded-full shadow-sm mb-3 flex items-center justify-center">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
												</svg>
											</div>
										{/if}
										<h3 class="font-medium text-pink-600 text-center">{artist.name}</h3>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if activeTab === 'browse'}
					<h2 class="text-2xl font-bold text-pink-600 mb-4">Browse</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="New releases" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">New Releases</h3>
							</div>
						</div>
						<div class="bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="Charts" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">Charts</h3>
							</div>
						</div>
						<div class="bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="Genres & Moods" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">Genres & Moods</h3>
							</div>
						</div>
						<div class="bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="New podcasts" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">Podcasts</h3>
							</div>
						</div>
						<div class="bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="Discover" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">Discover</h3>
							</div>
						</div>
						<div class="bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl shadow-lg overflow-hidden relative hover:shadow-xl transition-shadow">
							<img src="/api/placeholder/300/200" alt="Concerts" class="w-full h-48 object-cover opacity-50" />
							<div class="absolute inset-0 flex items-center justify-center">
								<h3 class="text-2xl font-bold text-white">Concerts</h3>
							</div>
						</div>
					</div>
				{:else if activeTab === 'radio'}
					<h2 class="text-2xl font-bold text-pink-600 mb-4">Radio Stations</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
							<div class="w-full h-48 bg-gradient-to-br from-pink-300 to-purple-300 rounded-lg flex items-center justify-center mb-3">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
								</svg>
							</div>
							<h3 class="font-medium text-pink-600">Pop Hits Radio</h3>
							<p class="text-xs text-pink-400 mt-1">The latest and greatest pop hits</p>
						</div>
						<div class="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
							<div class="w-full h-48 bg-gradient-to-br from-pink-400 to-purple-400 rounded-lg flex items-center justify-center mb-3">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
								</svg>
							</div>
							<h3 class="font-medium text-pink-600">Chill Lofi</h3>
							<p class="text-xs text-pink-400 mt-1">Relax with chill beats</p>
						</div>
						<div class="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
							<div class="w-full h-48 bg-gradient-to-br from-pink-300 to-purple-300 rounded-lg flex items-center justify-center mb-3">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
								</svg>
							</div>
							<h3 class="font-medium text-pink-600">K-Pop Stars</h3>
							<p class="text-xs text-pink-400 mt-1">The best of K-Pop</p>
						</div>
					</div>
				{/if}

				{#if selectedPlaylist}
					<div class="mt-10">
						<div class="bg-white rounded-xl shadow-md overflow-hidden mb-6">
							<div class="p-6 flex">
								{#if selectedPlaylist.images && selectedPlaylist.images.length > 0}
									<img src={selectedPlaylist.images[0].url} alt={selectedPlaylist.name} class="w-48 h-48 object-cover rounded-lg shadow-sm mr-6" />
								{:else}
									<div class="w-48 h-48 bg-pink-200 rounded-lg shadow-sm mr-6 flex items-center justify-center">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
										</svg>
									</div>
								{/if}
								<div>
									<h2 class="text-2xl font-bold text-pink-600 mb-2">{selectedPlaylist.name}</h2>
									<p class="text-sm text-pink-400 mb-4">By {selectedPlaylist.owner?.display_name || 'Unknown'}</p>
									<p class="text-sm text-pink-500">{selectedPlaylist.tracks?.total || tracks.length} tracks</p>
									<button class="mt-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-shadow">
										Play All
									</button>
								</div>
							</div>
						</div>

						<h2 class="text-xl font-bold text-pink-600 mb-4">Tracks</h2>
						<div class="bg-white rounded-xl shadow-md p-4">
							{#if tracks.length > 0}
								<ul class="divide-y divide-pink-100">
									{#each tracks as track, i}
										<li class="py-3 flex items-center hover:bg-pink-50 rounded-lg px-2 cursor-pointer" on:click={() => playTrack(track.uri)}>
											<span class="w-6 text-center text-pink-300 mr-4">{i + 1}</span>
											{#if track.album && track.album.images && track.album.images.length > 0}
												<img src={track.album.images[track.album.images.length - 1].url} alt={track.name} class="w-12 h-12 rounded-md shadow-sm mr-4" />
											{:else}
												<div class="w-12 h-12 bg-pink-200 rounded-md shadow-sm mr-4 flex items-center justify-center">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
													</svg>
												</div>
											{/if}
											<div class="flex-grow">
												<h3 class="font-medium text-pink-600">{track.name}</h3>
												<p class="text-xs text-pink-400">{track.artists.map((artist) => artist.name).join(', ')}</p>
											</div>
											<div class="text-xs text-pink-300">{formatTime(track.duration_ms)}</div>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-pink-400 text-center py-4">No tracks found in this playlist.</p>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<div class="flex items-center justify-center h-screen">
					<div class="text-center">
						<div class="animate-pulse mb-6">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
							</svg>
						</div>
						<h1 class="text-2xl font-bold text-pink-600 mb-2">Loading FUNG...</h1>
						<p class="text-pink-400">Connecting to Spotify...</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Player bar (fixed at bottom) -->
	{#if currentTrack}
		<div class="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-pink-100 z-10 p-3 flex items-center">
			<div class="flex items-center w-64">
				{#if currentTrack.album && currentTrack.album.images && currentTrack.album.images.length > 0}
					<img src={currentTrack.album.images[currentTrack.album.images.length - 1].url} alt={currentTrack.name} class="w-12 h-12 rounded-md shadow-sm mr-3" />
				{:else}
					<div class="w-12 h-12 bg-pink-200 rounded-md shadow-sm mr-3 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
						</svg>
					</div>
				{/if}
				<div class="overflow-hidden">
					<h3 class="font-medium text-pink-600 text-sm truncate">{currentTrack.name}</h3>
					<p class="text-xs text-pink-400 truncate">{currentTrack.artists.map((artist) => artist.name).join(', ')}</p>
				</div>
			</div>

			<div class="flex-grow max-w-2xl mx-auto">
				<div class="flex items-center justify-center space-x-6 mb-1">
					<button class="text-pink-400 hover:text-pink-600" on:click={() => skipTrack('previous')}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
						</svg>
					</button>
					<button class="text-pink-500 hover:text-pink-700 p-1 rounded-full bg-pink-100" on:click={() => player?.togglePlay()}>
						{#if isPlaying}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						{/if}
					</button>
					<button class="text-pink-400 hover:text-pink-600" on:click={() => skipTrack('next')}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
						</svg>
					</button>
				</div>
				<div class="flex items-center text-xs space-x-2">
					<span class="text-pink-400">{formatTime(progress)}</span>
					<div class="relative flex-grow">
						<div class="w-full bg-pink-100 rounded-full h-1">
							<div
								class="bg-gradient-to-r from-pink-400 to-purple-400 h-1 rounded-full"
								style="width: {(progress / currentTrack.duration_ms) * 100}%"
							></div>
						</div>
						<input
							type="range"
							min="0"
							max={currentTrack.duration_ms}
							bind:value={progress}
							on:change={() => seekTrack(progress)}
							class="w-full h-1 appearance-none bg-transparent absolute top-0 opacity-0 cursor-pointer"
						/>
					</div>
					<span class="text-pink-400">{formatTime(currentTrack.duration_ms)}</span>
				</div>
			</div>

			<div class="w-64 flex items-center justify-end">
				<div class="relative">
					<button
						class="text-pink-400 hover:text-pink-600 p-2"
						on:click={() => showVolumeSlider = !showVolumeSlider}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
						</svg>
					</button>
					{#if showVolumeSlider}
						<div class="absolute bottom-full right-0 mb-2 bg-white p-3 rounded-lg shadow-lg z-20">
							<input 
								type="range" 
								min="0" 
								max="1" 
								step="0.01" 
								bind:value={volume} 
								on:change={() => setVolume(volume)} 
								class="w-32 h-2 appearance-none bg-pink-200 rounded-full outline-none"
								style="--thumb-color: #ec4899;"
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

