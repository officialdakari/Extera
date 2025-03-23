/* eslint-disable no-nested-ternary */
import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';
import settings from '../../../../client/state/settings';

type BubbleLayoutProps = {
	before?: ReactNode;
	after?: ReactNode;
	rightAligned?: boolean;
	transparent?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(({ before, rightAligned, children, after, ...props }, ref) => {
	// const theme = useTheme();
	const isDark = settings.getThemeIndex() === 2;
	return (
		<Box
			justifyContent={rightAligned ? 'End' : undefined}
			gap="300"
			{...props}
			ref={ref}
		>
			<Box className={css.BubbleBefore} shrink="No">
				{before}
			</Box>
			<Box
				className={css.BubbleContent({
					dark: isDark ? (rightAligned ? 'local' : 'remote') : undefined,
					light: !isDark ? (rightAligned ? 'local' : 'remote') : undefined
				})}
				direction="Column"
			>
				{children}
				{after &&
					<div dir='ltr' className={css.BubbleAfter}>{after}</div>}
			</Box>
		</Box>
	);
});
