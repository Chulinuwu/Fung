<script lang="ts">
	import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
  
    onMount(() => {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = urlParams.get('access_token');
  
      if (accessToken) {
        goto("/");
      }
    });
  </script>
  