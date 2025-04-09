import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './layout.css';
import settings from '../../../../client/state/settings';

type BubbleLayoutProps = {
	before?: ReactNode;
	after?: ReactNode;
	rightAligned?: boolean;
	transparent?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(({ before, rightAligned, transparent, children, after, ...props }, ref) => {
	const isDark = settings.getThemeIndex() === 2;
	const theme = rightAligned ? 'local' : 'remote';
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
				className={
					classNames(
						css.BubbleContent({
							dark: isDark ? theme : undefined,
							light: !isDark ? theme : undefined
						}),
						transparent ? css.BubbleContentTransparent : null
					)
				}
				direction="Column"
			>
				{children}
				{after &&
					<div dir='ltr' className={css.BubbleAfter}>{after}</div>}
			</Box>
		</Box>
	);
});
