declare namespace Spotify {
	interface Player {
	  _options: {
		id: string;
	  };
	  connect: () => Promise<void>;
	  addListener: (event: string, callback: (state: any) => void) => void;
	}
  
	interface Track {
	  name: string;
	  artists: { name: string }[];
	  album: {
		images: { url: string }[];
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