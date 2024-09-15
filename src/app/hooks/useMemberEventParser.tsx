import React, { ReactNode } from 'react';
import { EventTimeline, MatrixEvent, Room } from 'matrix-js-sdk';
import { IMemberContent, Membership } from '../../types/matrix/room';
import { getMxIdLocalPart } from '../utils/matrix';
import { isMembershipChanged } from '../utils/room';
import { useMatrixClient } from './useMatrixClient';
import { mdiAccount, mdiAccountLock, mdiAccountLockOpen, mdiAccountPlus, mdiAccountRemove, mdiArrowRight, mdiAt } from '@mdi/js';
import { getText, translate } from '../../lang';
import cons from '../../client/state/cons';

export type ParsedResult = {
    icon: string;
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
                icon: mdiAccount,
                body: getText('membership.broken'),
            };

        const senderName = getDisplayName(senderId, mEvent.getRoomId());
        const userName = content.displayname || getDisplayName(userId, mEvent.getRoomId()) || getMxIdLocalPart(userId);

        if (isMembershipChanged(mEvent)) {
            if (content.membership === Membership.Invite) {
                if (prevContent.membership === Membership.Knock) {
                    return {
                        icon: mdiAccountPlus,
                        body: translate(
                            'membership.request_accepted',
                            <b>{senderName}</b>,
                            <b>{userName}</b>,
                            content.reason
                        ),
                    };
                }

                return {
                    icon: mdiAccountPlus,
                    body: translate(
                        'membership.invited',
                        <b>{senderName}</b>,
                        <b>{userName}</b>,
                        content.reason
                    ),
                };
            }

            if (content.membership === Membership.Knock) {
                return {
                    icon: mdiAccountPlus,
                    body: translate(
                        'membership.knock',
                        <b>{senderName}</b>,
                        content.reason
                    ),
                };
            }

            if (content.membership === Membership.Join) {
                return {
                    icon: mdiAccountPlus,
                    body: translate(
                        'membership.join',
                        <b>{senderName}</b>
                    ),
                };
            }

            if (content.membership === Membership.Leave) {
                if (prevContent.membership === Membership.Invite) {
                    return {
                        icon: mdiAccountRemove,
                        body:
                            senderId === userId ? (
                                translate(
                                    'membership.invite_rejected',
                                    <b>{senderName}</b>,
                                    content.reason
                                )
                            ) : (
                                translate(
                                    'membership.request_rejected',
                                    <b>{senderName}</b>,
                                    <b>{userName}</b>,
                                    content.reason
                                )
                            ),
                    };
                }

                if (prevContent.membership === Membership.Knock) {
                    return {
                        icon: mdiAccountRemove,
                        body:
                            senderId === userId ? (
                                translate(
                                    'membership.knock_cancel',
                                    <b>{userName}</b>,
                                    content.reason
                                )
                            ) : (
                                translate(
                                    'membership.invite_cancel',
                                    <b>{senderName}</b>,
                                    <b>{userName}</b>,
                                    content.reason
                                )
                            ),
                    };
                }

                if (prevContent.membership === Membership.Ban) {
                    return {
                        icon: mdiAccountLockOpen,
                        body: (
                            translate(
                                'membership.unban',
                                <b>{senderName}</b>,
                                <b>{userName}</b>,
                                content.reason
                            )
                        ),
                    };
                }

                return {
                    icon: mdiAccountRemove,
                    body:
                        senderId === userId ? (
                            translate(
                                'membership.leave',
                                <b>{userName}</b>,
                                content.reason
                            )
                        ) : (
                            translate(
                                'membership.kick',
                                <b>{senderName}</b>,
                                <b>{userName}</b>,
                                content.reason
                            )
                        ),
                };
            }

            if (content.membership === Membership.Ban) {
                return {
                    icon: mdiAccountLock,
                    body: (
                        translate(
                            'membership.ban',
                            <b>{senderName}</b>,
                            <b>{userName}</b>,
                            content.reason
                        )
                    ),
                };
            }
        }

        if (content.displayname !== prevContent.displayname) {
            const prevUserName = prevContent.displayname || userId;

            return {
                icon: mdiAt,
                body: content.displayname ? (
                    translate(
                        'membership.display_name',
                        <b>{prevUserName}</b>,
                        <b>{userName}</b>
                    )
                ) : (
                    translate(
                        'membership.remove_display_name',
                        <b>{prevUserName}</b>
                    )
                ),
            };
        }
        if (content.avatar_url !== prevContent.avatar_url) {
            return {
                icon: mdiAccount,
                body: content.avatar_url ? (
                    translate(
                        'membership.avatar',
                        <b>{userName}</b>,
                    )
                ) : (
                    translate(
                        'membership.remove_avatar',
                        <b>{userName}</b>,
                    )
                ),
            };
        }

        //@ts-ignore
        if (content[cons.EXTERA_BANNER_URL] !== prevContent[cons.EXTERA_BANNER_URL]) {
            return {
                icon: mdiAccount,
                //@ts-ignore
                body: content[cons.EXTERA_BANNER_URL] ? (
                    translate(
                        'membership.banner',
                        <b>{userName}</b>,
                    )
                ) : (
                    translate(
                        'membership.remove_banner',
                        <b>{userName}</b>,
                    )
                ),
            };
        }

        return {
            icon: mdiAccount,
            body: getText('membership.broken'),
        };
    };

    return parseMemberEvent;
};
