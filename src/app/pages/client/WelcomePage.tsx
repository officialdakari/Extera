import React from 'react';
import { Box, Text, config, toRem } from 'folds';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import cons from '../../../client/state/cons';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiCodeBraces, mdiHeart } from '@mdi/js';
import { Button } from '@mui/material';
import { AttachMoney, Code } from '@mui/icons-material';

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
                                    variant='contained'
                                    color='primary'
                                    href='https://github.com/OfficialDakari/Extera'
                                    target='_blank'
                                    rel='noreferrer noopener'
                                    startIcon={<Code />}
                                >
                                    {getText('btn.source_code')}
                                </Button>
                                <Button
                                    variant='outlined'
                                    color='info'
                                    href="https://officialdakari.ru/sponsor/"
                                    target='_blank'
                                    rel='noreferrer noopener'
                                    startIcon={<AttachMoney />}
                                >
                                    {getText('btn.sponsor')}
                                </Button>
                            </Box>
                        </Box>
                    </PageHero>
                </PageHeroSection>
            </Box>
        </Page>
    );
}
