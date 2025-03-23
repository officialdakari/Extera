import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

export const MessageBase = style({
	position: 'relative',
	transition: 'linear',
});

export const MessageBaseSending = style({
	position: 'relative',
	transition: 'linear',
	opacity: 0.5,
});

export const MessageBaseFailed = style({
	position: 'relative',
	transition: 'linear',
	backgroundColor: '#e2221630'
});

export const MessageTimestamp = style({
	opacity: 0.4
});

export const MessageOptionsBase = style([
	DefaultReset,
	{
		position: 'absolute',
		top: toRem(-30),
		right: 0,
		zIndex: 1
	},
]);
export const MessageOptionsBar = style([
	DefaultReset,
	{
		padding: config.space.S100
	}
]);

export const MessageAvatar = style({
	cursor: 'pointer',
});

export const MessageQuickReaction = style({
	minWidth: toRem(32),
});

export const MessageMenuGroup = style({
	padding: config.space.S100
});

export const MessageMenu = style({

});

export const MessageMenuItemText = style({
	flexGrow: 1,
});

export const ReactionsContainer = style({
	selectors: {
		'&:empty': {
			display: 'none',
		},
	},
});

export const ReactionsTooltipText = style({
	wordBreak: 'break-word',
});
