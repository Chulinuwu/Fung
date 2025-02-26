<main class="max-w-screen">
  <nav class="w-full max-w-screen flex justify-end p-4 bg-pink-100 shadow-md">
    {#if accessToken}
      <button 
        on:click={logout} 
        class="bg-white text-pink-500 rounded-full px-4 py-2 hover:bg-pink-100 transition-colors shadow-md"
      >
        Logout
      </button>
    {/if}
  </nav>
  <slot/>
</main>

  
  <script lang="ts">
    import { onMount } from 'svelte';
    import '../app.css';
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
      accessToken = null;
      
      window.location.reload(); // Reload the page
    };
  </script>