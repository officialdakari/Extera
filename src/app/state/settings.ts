import { atom } from 'jotai';
import cons from '../../client/state/cons';

const STORAGE_KEY = 'settings';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export type MessageLayout = 0 | 1 | 2;

export type Plugin = {
	url: string;
	name: string;
	enabled: boolean;
};

export type Theme = {
	url: string;
	name: string;
	enabled: boolean;
};

export interface Settings {
	themeIndex: number;
	useSystemTheme: boolean;
	isMarkdown: boolean;
	editorToolbar: boolean;
	twitterEmoji: boolean;

	cordovaNotifications: boolean;

	isPeopleDrawer: boolean;
	memberSortFilterIndex: number;
	enterForNewline: boolean;
	messageLayout: MessageLayout;
	messageSpacing: MessageSpacing;
	hideMembershipEvents: boolean;
	hideNickAvatarEvents: boolean;
	mediaAutoLoad: boolean;
	urlPreview: boolean;
	encUrlPreview: boolean;
	showHiddenEvents: boolean;

	showNotifications: boolean;
	isNotificationSounds: boolean;

	extera_hideTgAds: boolean;
	extera_enableCaptions: boolean;
	extera_renameTgBot: boolean;
	extera_ghostMode: boolean;
	extera_smoothScroll: boolean;
	extera_status: number;
	extera_status_message: string;
	extera_wallpaper: string | null;
	pushesEnabled: boolean;
	newDesignInput: boolean;
	hideEmojiAdvert: boolean;
	replyFallbacks: boolean;
	voiceMessages: boolean;
	ignorePolicies: boolean;

	plugins: Plugin[];
	themes: Theme[];
}

const defaultSettings: Settings = {
	themeIndex: 0,
	useSystemTheme: true,
	isMarkdown: true,
	editorToolbar: false,
	twitterEmoji: true,

	cordovaNotifications: false,

	isPeopleDrawer: true,
	memberSortFilterIndex: 0,
	enterForNewline: true,
	messageLayout: 0,
	messageSpacing: '400',
	hideMembershipEvents: false,
	hideNickAvatarEvents: false,
	mediaAutoLoad: true,
	urlPreview: false,
	encUrlPreview: false,
	showHiddenEvents: false,

	showNotifications: true,
	isNotificationSounds: true,

	extera_enableCaptions: true,
	extera_hideTgAds: true,
	extera_renameTgBot: false,
	extera_ghostMode: false,
	extera_smoothScroll: true,
	extera_status: 0,
	extera_status_message: `Hello! I am using ${cons.name}.`,
	extera_wallpaper: null,
	pushesEnabled: false,
	newDesignInput: true,
	hideEmojiAdvert: false,
	replyFallbacks: false,
	voiceMessages: true,
	ignorePolicies: false,

	plugins: [],
	themes: [],
};

export const getSettings = () => {
	const settings = localStorage.getItem(STORAGE_KEY);
	if (settings === null) return defaultSettings;
	return {
		...defaultSettings,
		...(JSON.parse(settings) as Settings),
	};
};

export const setSettings = (settings: Settings) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
	(get) => get(baseSettings),
	(get, set, update) => {
		set(baseSettings, update);
		setSettings(update);
	}
);
