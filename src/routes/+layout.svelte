<nav>
    <h1>Spotify App</h1>
    {#if accessToken}
      <button on:click={logout}>Logout</button>
    {/if}
  </nav>
  
  <slot />
  
  <script lang="ts">
    import { onMount } from 'svelte';
  
    let accessToken: string | null = null;
  
    onMount(() => {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = urlParams.get('access_token');
  
      if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
      } else {
        accessToken = localStorage.getItem('spotify_access_token');
      }
    });
  
    const logout = () => {
      localStorage.removeItem('spotify_access_token');
      window.location.href = '/'; // Redirect ไปที่หน้าแรก
    };
  </script>