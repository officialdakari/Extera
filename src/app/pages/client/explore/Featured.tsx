import React from 'react';
import { Box, Scroll, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { RoomCard, RoomCardGrid } from '../../../components/room-card';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { RoomSummaryLoader } from '../../../components/RoomSummaryLoader';
import {
    Page,
    PageContent,
    PageContentCenter,
    PageHero,
    PageHeroSection,
} from '../../../components/page';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import * as css from './style.css';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiAlertCircleOutline, mdiStar, mdiStarCircleOutline } from '@mdi/js';

export function FeaturedRooms() {
    const { featuredCommunities } = useClientConfig();
    const { rooms, spaces } = featuredCommunities ?? {};
    const allRooms = useAtomValue(allRoomsAtom);
    const { navigateSpace, navigateRoom } = useRoomNavigate();

    return (
        <Page>
            <Box grow="Yes">
                <Scroll hideTrack visibility="Hover">
                    <PageContent>
                        <PageContentCenter>
                            <Box direction="Column" gap="200">
                                <PageHeroSection>
                                    <PageHero
                                        icon={<Icon size={1} path={mdiStar} />}
                                        title={getText('explore.featured.title')}
                                        subTitle={getText('explore.featured.subtitle')}
                                    />
                                </PageHeroSection>
                                <Box direction="Column" gap="700">
                                    {spaces && spaces.length > 0 && (
                                        <Box direction="Column" gap="400">
                                            <Text size="H4">{getText('explore.featured_spaces')}</Text>
                                            <RoomCardGrid>
                                                {spaces.map((roomIdOrAlias) => (
                                                    <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                                                        {(roomSummary) => (
                                                            <RoomCard
                                                                roomIdOrAlias={roomIdOrAlias}
                                                                allRooms={allRooms}
                                                                avatarUrl={roomSummary?.avatar_url}
                                                                name={roomSummary?.name}
                                                                topic={roomSummary?.topic}
                                                                memberCount={roomSummary?.num_joined_members}
                                                                onView={navigateSpace}
                                                                renderTopicViewer={(name, topic, requestClose) => (
                                                                    <RoomTopicViewer
                                                                        name={name}
                                                                        topic={topic}
                                                                        requestClose={requestClose}
                                                                    />
                                                                )}
                                                            />
                                                        )}
                                                    </RoomSummaryLoader>
                                                ))}
                                            </RoomCardGrid>
                                        </Box>
                                    )}
                                    {rooms && rooms.length > 0 && (
                                        <Box direction="Column" gap="400">
                                            <Text size="H4">{getText('explore.featured_rooms')}</Text>
                                            <RoomCardGrid>
                                                {rooms.map((roomIdOrAlias) => (
                                                    <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                                                        {(roomSummary) => (
                                                            <RoomCard
                                                                roomIdOrAlias={roomIdOrAlias}
                                                                allRooms={allRooms}
                                                                avatarUrl={roomSummary?.avatar_url}
                                                                name={roomSummary?.name}
                                                                topic={roomSummary?.topic}
                                                                memberCount={roomSummary?.num_joined_members}
                                                                onView={navigateRoom}
                                                                renderTopicViewer={(name, topic, requestClose) => (
                                                                    <RoomTopicViewer
                                                                        name={name}
                                                                        topic={topic}
                                                                        requestClose={requestClose}
                                                                    />
                                                                )}
                                                            />
                                                        )}
                                                    </RoomSummaryLoader>
                                                ))}
                                            </RoomCardGrid>
                                        </Box>
                                    )}
                                    {((spaces && spaces.length === 0 && rooms && rooms.length === 0) ||
                                        (!spaces && !rooms)) && (
                                            <Box
                                                className={css.RoomsInfoCard}
                                                direction="Column"
                                                justifyContent="Center"
                                                alignItems="Center"
                                                gap="200"
                                            >
                                                <Icon size={1} path={mdiAlertCircleOutline} />
                                                <Text size="T300" align="Center">
                                                    {getText('explore.no_featured')}
                                                </Text>
                                            </Box>
                                        )}
                                </Box>
                            </Box>
                        </PageContentCenter>
                    </PageContent>
                </Scroll>
            </Box>
        </Page>
    );
}
