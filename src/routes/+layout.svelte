<main class="max-w-sceen">
<nav class="w-full  max-w-screen  flex justify-end">
    {#if accessToken}
      <button on:click={logout}>Logout</button>
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