import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

export const Attachment = style({
	overflow: 'hidden',
	maxWidth: '100%',
	width: toRem(400),
});

export const AttachmentHeader = style({
	padding: config.space.S300,
});

export const AttachmentBox = style([
	DefaultReset,
	{
		maxWidth: '100%',
		maxHeight: toRem(600),
		width: toRem(400),
		overflow: 'hidden',
	},
]);

export const AttachmentContent = style({
	padding: config.space.S500,
	paddingTop: 0,
});
