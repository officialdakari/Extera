import React, { ReactNode } from 'react';
import { IconSrc, Icons } from 'folds';
import { EventTimeline, MatrixEvent, Room } from 'matrix-js-sdk';
import { IMemberContent, Membership } from '../../types/matrix/room';
import { getMxIdLocalPart } from '../utils/matrix';
import { isMembershipChanged } from '../utils/room';
import { useMatrixClient } from './useMatrixClient';

export type ParsedResult = {
    icon: IconSrc;
    body: ReactNode;
};

export type MemberEventParser = (mEvent: MatrixEvent) => ParsedResult;

export const useMemberEventParser = (): MemberEventParser => {
    const mx = useMatrixClient();
    const getDisplayName = (mxId?: string, roomId?: string) => {
        if (!mxId) return '[unknown]';
        if (!roomId) return mxId;
        const room = mx.getRoom(roomId);
        if (!room) return mxId;
        const timeline = room.getLiveTimeline();
        const state = timeline.getState(EventTimeline.FORWARDS);
        if (!state) return mxId;
        const memberEvent = state.getStateEvents('m.room.member', mxId);
        if (!memberEvent) return mxId;
        const content = memberEvent.getContent();
        return content.displayname || mxId;
    };

    const parseMemberEvent: MemberEventParser = (mEvent) => {
        const content = mEvent.getContent<IMemberContent>();
        const prevContent = mEvent.getPrevContent() as IMemberContent;
        const senderId = mEvent.getSender();
        const userId = mEvent.getStateKey();

        if (!senderId || !userId)
            return {
                icon: Icons.User,
                body: 'Broken membership event',
            };

        const senderName = getDisplayName(senderId, mEvent.getRoomId());
        const userName = content.displayname || getDisplayName(userId, mEvent.getRoomId()) || getMxIdLocalPart(userId);

        if (isMembershipChanged(mEvent)) {
            if (content.membership === Membership.Invite) {
                if (prevContent.membership === Membership.Knock) {
                    return {
                        icon: Icons.ArrowGoRightPlus,
                        body: (
                            <>
                                <b>{senderName}</b>
                                {' accepted '}
                                <b>{userName}</b>
                                {`'s join request `}
                                {content.reason}
                            </>
                        ),
                    };
                }

                return {
                    icon: Icons.ArrowGoRightPlus,
                    body: (
                        <>
                            <b>{senderName}</b>
                            {' invited '}
                            <b>{userName}</b> {content.reason}
                        </>
                    ),
                };
            }

            if (content.membership === Membership.Knock) {
                return {
                    icon: Icons.ArrowGoRightPlus,
                    body: (
                        <>
                            <b>{userName}</b>
                            {' request to join room '}
                            {content.reason}
                        </>
                    ),
                };
            }

            if (content.membership === Membership.Join) {
                return {
                    icon: Icons.ArrowGoRight,
                    body: (
                        <>
                            <b>{userName}</b>
                            {' joined the room'}
                        </>
                    ),
                };
            }

            if (content.membership === Membership.Leave) {
                if (prevContent.membership === Membership.Invite) {
                    return {
                        icon: Icons.ArrowGoRightCross,
                        body:
                            senderId === userId ? (
                                <>
                                    <b>{userName}</b>
                                    {' rejected the invitation '}
                                    {content.reason}
                                </>
                            ) : (
                                <>
                                    <b>{senderName}</b>
                                    {' rejected '}
                                    <b>{userName}</b>
                                    {`'s join request `}
                                    {content.reason}
                                </>
                            ),
                    };
                }

                if (prevContent.membership === Membership.Knock) {
                    return {
                        icon: Icons.ArrowGoRightCross,
                        body:
                            senderId === userId ? (
                                <>
                                    <b>{userName}</b>
                                    {' revoked joined request '}
                                    {content.reason}
                                </>
                            ) : (
                                <>
                                    <b>{senderName}</b>
                                    {' revoked '}
                                    <b>{userName}</b>
                                    {`'s invite `}
                                    {content.reason}
                                </>
                            ),
                    };
                }

                if (prevContent.membership === Membership.Ban) {
                    return {
                        icon: Icons.ArrowGoLeft,
                        body: (
                            <>
                                <b>{senderName}</b>
                                {' unbanned '}
                                <b>{userName}</b> {content.reason}
                            </>
                        ),
                    };
                }

                return {
                    icon: Icons.ArrowGoLeft,
                    body:
                        senderId === userId ? (
                            <>
                                <b>{userName}</b>
                                {' left the room '}
                                {content.reason}
                            </>
                        ) : (
                            <>
                                <b>{senderName}</b>
                                {' kicked '}
                                <b>{userName}</b> {content.reason}
                            </>
                        ),
                };
            }

            if (content.membership === Membership.Ban) {
                return {
                    icon: Icons.ArrowGoLeft,
                    body: (
                        <>
                            <b>{senderName}</b>
                            {' banned '}
                            <b>{userName}</b> {content.reason}
                        </>
                    ),
                };
            }
        }

        if (content.displayname !== prevContent.displayname) {
            const prevUserName = prevContent.displayname || userId;

            return {
                icon: Icons.Mention,
                body: content.displayname ? (
                    <>
                        <b>{prevUserName}</b>
                        {' changed display name to '}
                        <b>{userName}</b>
                    </>
                ) : (
                    <>
                        <b>{prevUserName}</b>
                        {' removed their display name '}
                    </>
                ),
            };
        }
        if (content.avatar_url !== prevContent.avatar_url) {
            return {
                icon: Icons.User,
                body: content.displayname ? (
                    <>
                        <b>{userName}</b>
                        {' changed their avatar'}
                    </>
                ) : (
                    <>
                        <b>{userName}</b>
                        {' removed their avatar '}
                    </>
                ),
            };
        }

        if (content['ru.officialdakari.extera_banner'] !== prevContent['ru.officialdakari.extera_banner']) {
            return {
                icon: Icons.User,
                body: content['ru.officialdakari.extera_banner'] ? (
                    <>
                        <b>{userName}</b>
                        {' changed their banner'}
                    </>
                ) : (
                    <>
                        <b>{userName}</b>
                        {' removed their banner'}
                    </>
                ),
            };
        }

        return {
            icon: Icons.User,
            body: 'Broken membership event',
        };
    };

    return parseMemberEvent;
};
