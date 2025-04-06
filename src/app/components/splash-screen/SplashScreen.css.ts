import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const SplashScreen = style({
	minHeight: '100%',
	backgroundColor: `var(--md-sys-color-background)`,
	color: `var(--md-sys-color-on-background)`,
});

export const SplashScreenFooter = style({
	padding: config.space.S400,
});
