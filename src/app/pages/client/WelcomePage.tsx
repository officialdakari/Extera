import React from 'react';
import { Box, Button, Text, config, toRem } from 'folds';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import cons from '../../../client/state/cons';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiCodeBraces, mdiHeart } from '@mdi/js';

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
                                    as="a"
                                    href="https://github.com/OfficialDakari/Extera"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    before={<Icon size={1} path={mdiCodeBraces} />}
                                >
                                    <Text as="span" size="B400">
                                        {getText('btn.source_code')}
                                    </Text>
                                </Button>
                                <Button
                                    as="a"
                                    href="https://officialdakari.ru/sponsor/"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    fill="Soft"
                                    before={<Icon size={1} path={mdiHeart} />}
                                >
                                    <Text as="span" size="B400">
                                        {getText('btn.sponsor')}
                                    </Text>
                                </Button>
                            </Box>
                        </Box>
                    </PageHero>
                </PageHeroSection>
            </Box>
        </Page>
    );
}
