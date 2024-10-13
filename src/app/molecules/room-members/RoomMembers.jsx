import React, {
    useState, useEffect, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import './RoomMembers.scss';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';
import { openProfileViewer } from '../../../client/action/navigation';
import { getUsernameOfRoomMember, getPowerLabel } from '../../../util/matrixUtil';
import AsyncSearch from '../../../util/AsyncSearch';
import { memberByAtoZ, memberByPowerLevel } from '../../../util/sort';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import PeopleSelector from '../people-selector/PeopleSelector';
import { getText } from '../../../lang';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { usePresences } from '../../hooks/usePresences';
import cons from '../../../client/state/cons';
import { VerificationBadge } from '../../components/verification-badge/VerificationBadge';
import { TextField, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import { AccessTime, Person, PersonAdd, PersonOff } from '@mui/icons-material';

const PER_PAGE_MEMBER = 50;

function normalizeMembers(members) {
    const mx = initMatrix.matrixClient;
    return members.map((member) => ({
        userId: member.userId,
        name: getUsernameOfRoomMember(member),
        username: member.userId.slice(1, member.userId.indexOf(':')),
        avatarSrc: member.getAvatarUrl(mx.baseUrl, 24, 24, 'crop'),
        peopleRole: getPowerLabel(member.powerLevel),
        powerLevel: members.powerLevel,
    }));
}

function useMemberOfMembership(roomId, membership) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    const [members, setMembers] = useState([]);

    useEffect(() => {
        let isMounted = true;
        let isLoadingMembers = false;

        const updateMemberList = (event) => {
            if (isLoadingMembers) return;
            if (event && event?.getRoomId() !== roomId) return;
            const memberOfMembership = normalizeMembers(
                room.getMembersWithMembership(membership)
                    .sort(memberByAtoZ).sort(memberByPowerLevel),
            );
            setMembers(memberOfMembership);
        };

        updateMemberList();
        isLoadingMembers = true;
        room.loadMembersIfNeeded().then(() => {
            isLoadingMembers = false;
            if (!isMounted) return;
            updateMemberList();
        });

        mx.on('RoomMember.membership', updateMemberList);
        mx.on('RoomMember.powerLevel', updateMemberList);
        return () => {
            isMounted = false;
            mx.removeListener('RoomMember.membership', updateMemberList);
            mx.removeListener('RoomMember.powerLevel', updateMemberList);
        };
    }, [membership]);

    return [members];
}

function useSearchMembers(members) {
    const [searchMembers, setSearchMembers] = useState(null);
    const [asyncSearch] = useState(new AsyncSearch());

    const reSearch = useCallback(() => {
        if (searchMembers) {
            asyncSearch.search(searchMembers.term);
        }
    }, [searchMembers, asyncSearch]);

    useEffect(() => {
        asyncSearch.setup(members, {
            keys: ['name', 'username', 'userId'],
            limit: PER_PAGE_MEMBER,
        });
        reSearch();
    }, [members, asyncSearch]);

    useEffect(() => {
        const handleSearchData = (data, term) => setSearchMembers({ data, term });
        asyncSearch.on(asyncSearch.RESULT_SENT, handleSearchData);
        return () => {
            asyncSearch.removeListener(asyncSearch.RESULT_SENT, handleSearchData);
        };
    }, [asyncSearch]);

    const handleSearch = (e) => {
        const term = e.target.value;
        if (term === '' || term === undefined) {
            setSearchMembers(null);
        } else asyncSearch.search(term);
    };

    return [searchMembers, handleSearch];
}

function RoomMembers({ roomId }) {
    const mx = useMatrixClient();
    const [itemCount, setItemCount] = useState(PER_PAGE_MEMBER);
    const [membership, setMembership] = useState('join');
    const [members] = useMemberOfMembership(roomId, membership);
    const [searchMembers, handleSearch] = useSearchMembers(members);

    useEffect(() => {
        setItemCount(PER_PAGE_MEMBER);
    }, [searchMembers]);

    const loadMorePeople = () => {
        setItemCount(itemCount + PER_PAGE_MEMBER);
    };

    const getPresenceFn = usePresences();
    const [avStyles, setAvStyles] = useState({});
    const [statusMsgs, setStatusMsgs] = useState({});

    const mList = searchMembers ? searchMembers.data : members.slice(0, itemCount);

    useEffect(() => {
        const fetchMemberAvStylesAndStatus = () => {
            const newAvStyles = {};
            const newStatusMsgs = {};

            members.map((member) => {
                try {
                    const presence = getPresenceFn(member.userId);
                    if (!presence) return;
                    newAvStyles[member.userId] = presence.presence;
                    newStatusMsgs[member.userId] = presence.presenceStatusMsg ?? presence.presence;
                } catch (error) {
                    // handle error if needed
                    console.error(`Could not load presence for ${member.userId}`, error);
                }
            });

            setAvStyles(newAvStyles);
            setStatusMsgs(newStatusMsgs);
        };

        fetchMemberAvStylesAndStatus();
    }, [members, mList, mx]);

    const theme = useTheme();

    return (
        <div className="room-members">
            <SearchContainer>
                <SearchIconWrapper>
                    <SearchIcon />
                </SearchIconWrapper>
                <SearchInputBase
                    onChange={handleSearch}
                    placeholder={getText('placeholder.search_room_members')}
                />
            </SearchContainer>
            <div className="room-members__header">
                <MenuHeader>{searchMembers ? getText('room_members.1', mList.length) : getText('room_members.found', members.length)}</MenuHeader>
                <ToggleButtonGroup>
                    <ToggleButton
                        size='small'
                        selected={membership === 'join'}
                        onClick={() => setMembership('join')}
                    >
                        <Person />
                    </ToggleButton>
                    <ToggleButton
                        size='small'
                        selected={membership === 'knock'}
                        onClick={() => setMembership('knock')}
                    >
                        <AccessTime />
                    </ToggleButton>
                    <ToggleButton
                        size='small'
                        selected={membership === 'invite'}
                        onClick={() => setMembership('invite')}
                    >
                        <PersonAdd />
                    </ToggleButton>
                    <ToggleButton
                        size='small'
                        selected={membership === 'ban'}
                        onClick={() => setMembership('ban')}
                    >
                        <PersonOff />
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>
            <div className="room-members__list">
                {mList.map((member) => (
                    <PeopleSelector
                        key={member.userId}
                        onClick={() => openProfileViewer(member.userId, roomId)}
                        avatarSrc={member.avatarSrc}
                        name={member.name}
                        color={colorMXID(member.userId)}
                        peopleRole={member.peopleRole}
                        avStyle={avStyles[member.userId]}
                        status={statusMsgs[member.userId]}
                        verificationBadge={<VerificationBadge userId={member.userId} userName={member.name} />}
                    />
                ))}
                {
                    (searchMembers?.data.length === 0 || members.length === 0)
                    && (
                        <div className="room-members__status">
                            <Text variant="b2">
                                {getText(searchMembers ? 'generic.no_results' : 'room_members.empty', searchMembers?.term)}
                            </Text>
                        </div>
                    )
                }
                {
                    mList.length !== 0
                    && members.length > itemCount
                    && searchMembers === null
                    && <Button onClick={loadMorePeople}>{getText('generic.view_more')}</Button>
                }
            </div>
        </div>
    );
}

RoomMembers.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomMembers;
