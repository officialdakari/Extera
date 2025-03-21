const WALLPAPER_KEY = 'wallpaper-v1';

const saveWallpaper = (url: string): boolean => {
	try {
		localStorage.setItem(WALLPAPER_KEY, url);
		return true;
	} catch (error) {
		console.error('Failed to save wallpaper:', error);
		return false;
	}
};

const getWallpaper = (): string | null => {
	try {
		return localStorage.getItem(WALLPAPER_KEY);
	} catch (error) {
		console.error('Failed to get wallpaper:', error);
		return null;
	}
};

const removeWallpaper = (): boolean => {
	try {
		localStorage.removeItem(WALLPAPER_KEY);
		return true;
	} catch (error) {
		console.error('Failed to remove wallpaper:', error);
		return false;
	}
};

export {
	getWallpaper,
	saveWallpaper,
	removeWallpaper
};
