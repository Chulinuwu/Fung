declare namespace Spotify {
	interface Player {
	  _options: {
		id: string;
	  };
	  connect: () => Promise<void>;
	  addListener: (event: string, callback: (state: any) => void) => void;
	}
  
	interface Track {
	  uri: string;
	  name: string;
	  artists: { name: string }[];
	  album: {
		images: { url: string }[];
	  };
	}
  
	interface Playlist {
	  id: string;
	  name: string;
	  tracks: {
		total: number;
	  };
	}
  }
  
  declare global {
	interface Window {
	  Spotify: {
		Player: new (options: {
		  name: string;
		  getOAuthToken: (cb: (token: string) => void) => void;
		  volume: number;
		}) => Spotify.Player;
	  };
	}
  }