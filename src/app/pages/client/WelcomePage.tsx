import React from 'react';
import { Box, config, toRem } from 'folds';
import { AttachMoney, Code } from '@mui/icons-material';
import { Button, Typography } from 'react-you-ui';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import cons from '../../../client/state/cons';
import { getText } from '../../../lang';

export function WelcomePage() {
	return (
		<Page>
			<Box
				grow="Yes"
				style={{ padding: config.space.S400, paddingBottom: config.space.S700 }}
				alignItems="Center"
				justifyContent="Center"
			>
				<PageHeroSection>
					<PageHero
						icon={<img width="70" height="70" src={CinnySVG} alt="Client Logo" />}
						title={getText('welcome')}
						subTitle={
							<span>
								{getText('welcome.2')}{' '}
								<a
									href="https://github.com/OfficialDakari/Extera"
									target="_blank"
									rel="noreferrer noopener"
								>
									{cons.version}
								</a>
							</span>
						}
					>
						<Box justifyContent="Center">
							<Box grow="Yes" style={{ maxWidth: toRem(300) }} direction="Column" gap="300">
								<Button
									variant='filled'
									href='https://github.com/OfficialDakari/Extera'
									target='_blank'
									rel='noreferrer noopener'
								>
									<span style={{ display: 'flex', gap: '8px', alignContent: 'end' }}>
										<Code />
										<Typography>
											{getText('btn.source_code')}
										</Typography>
									</span>
								</Button>
								<Button
									variant='filled-tonal'
									href="https://officialdakari.ru/sponsor/"
									target='_blank'
									rel='noreferrer noopener'
								>
									<span style={{ display: 'flex', gap: '8px', alignContent: 'end' }}>
										<AttachMoney />
										<Typography>
											{getText('btn.sponsor')}
										</Typography>
									</span>
								</Button>
							</Box>
						</Box>
					</PageHero>
				</PageHeroSection>
			</Box>
		</Page>
	);
}
