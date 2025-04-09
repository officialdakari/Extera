import { Box, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
// import * as patternsCSS from '../../styles/Patterns.css';
import * as css from './SplashScreen.css';
import cons from '../../../client/state/cons';
import { initEruda } from '../../utils/eruda';

type SplashScreenProps = {
	children: ReactNode;
};
export function SplashScreen({ children }: SplashScreenProps) {
	return (
		<Box
			className={classNames(css.SplashScreen)}
			direction="Column"
		>
			{children}
			<Box
				className={css.SplashScreenFooter}
				shrink="No"
				alignItems="Center"
				justifyContent="Center"
			>
				<Text onClick={initEruda} size="H2" align="Center">
					{cons.name}
				</Text>
			</Box>
		</Box>
	);
}
