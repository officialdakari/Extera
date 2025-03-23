import { keyframes, style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

// кто сократил animation до anime
const SlideUpAnime = keyframes({
	from: {
		transform: 'translateY(100%)',
	},
	to: {
		transform: 'translateY(0)',
	},
});

export const RoomViewTyping = style([
	DefaultReset,
	{
		padding: `0 ${config.space.S500}`,
		width: '100%',
		backgroundColor: 'transparent',
		color: 'var(--mui-palette-text-primary)',
		position: 'absolute',
		bottom: 0,
		animation: `${SlideUpAnime} 100ms ease-in-out`,
	},
]);
export const TypingText = style({
	flexGrow: 1,
});
