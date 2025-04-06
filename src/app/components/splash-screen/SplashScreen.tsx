import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, Typography } from 'react-you-ui';
// import * as patternsCSS from '../../styles/Patterns.css';
import * as css from './SplashScreen.css';
import cons from '../../../client/state/cons';
// import { initEruda } from '../../utils/eruda';

type SplashScreenProps = {
	children: ReactNode;
};
export function SplashScreen({ children }: SplashScreenProps) {
	return (
		<Box
			className={classNames(css.SplashScreen)}
			display='flex'
			flexDirection="column"
		>
			{children}
			<Box
				className={css.SplashScreenFooter}
				flexShrink={0}
				alignItems="center"
				justifyContent="center"
			>
				<Typography variant="h6" align="center">
					{cons.name}
				</Typography>
			</Box>
		</Box>
	);
}
