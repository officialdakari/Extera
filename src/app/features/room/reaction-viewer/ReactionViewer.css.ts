import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const ReactionViewer = style([
	DefaultReset,
	{
		height: '100%',
	},
]);

export const Sidebar = style({

});
export const SidebarContent = style({
	padding: config.space.S200,
	paddingRight: 0,
});

export const Header = style({
	paddingLeft: config.space.S400,
	paddingRight: config.space.S300,

	flexShrink: 0,
	gap: config.space.S200,
});

export const Content = style({
	paddingLeft: config.space.S200,
	paddingBottom: config.space.S400,
});
