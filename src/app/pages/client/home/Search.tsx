import React, { useRef } from 'react';
import { Box, Text, Scroll } from 'folds';
import { Icon as MDIcon } from '@mdi/react';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useHomeRooms } from './useHomeRooms';
import { getText } from '../../../../lang';
import { mdiMagnify } from '@mdi/js';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export function HomeSearch() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rooms = useHomeRooms();

    return (
        <Page>
            <AppBar position='static'>
                <Toolbar>
                    <IconButton onClick={() => history.back()}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant='h6'>
                        {getText('msg_search.title')}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box style={{ position: 'relative' }} grow="Yes">
                <Scroll ref={scrollRef} hideTrack visibility="Hover">
                    <PageContent>
                        <PageContentCenter>
                            <MessageSearch
                                defaultRoomsFilterName="Home"
                                allowGlobal
                                rooms={rooms}
                                scrollRef={scrollRef}
                            />
                        </PageContentCenter>
                    </PageContent>
                </Scroll>
            </Box>
        </Page>
    );
}
