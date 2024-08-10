import React, { useRef } from 'react';
import { Box, Text, Scroll } from 'folds';
import { Icon as MDIcon } from '@mdi/react';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useHomeRooms } from './useHomeRooms';
import { getText } from '../../../../lang';
import { mdiMagnify } from '@mdi/js';

export function HomeSearch() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rooms = useHomeRooms();

    return (
        <Page>
            <PageHeader>
                <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
                    <MDIcon size={1} path={mdiMagnify} />
                    <Text size="H3">
                        {getText('msg_search.title')}
                    </Text>
                </Box>
            </PageHeader>
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
