import React from 'react';

import ProfileViewer from '../profile-viewer/ProfileViewer';
import SpaceAddExisting from '../../molecules/space-add-existing/SpaceAddExisting';
import Search from '../search/Search';
import CreateRoom from '../create-room/CreateRoom';
import JoinAlias from '../join-alias/JoinAlias';
import EmojiVerification from '../emoji-verification/EmojiVerification';

import ReusableDialog from '../../molecules/dialog/ReusableDialog';
import HiddenRooms from '../hidden-rooms/HiddenRooms';
import ShareMenu from '../share-menu/ShareMenu';

function Dialogs() {
    return (
        <>
            <ProfileViewer />
            <CreateRoom />
            <JoinAlias />
            <SpaceAddExisting />
            <Search />
            <HiddenRooms />
            <ShareMenu />
            <EmojiVerification />

            <ReusableDialog />
        </>
    );
}

export default Dialogs;
