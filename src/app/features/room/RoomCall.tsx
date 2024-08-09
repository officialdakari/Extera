import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { Avatar, Box, Icon, IconButton, Icons, Text } from "folds";
import { CallEvent, Room, User } from "matrix-js-sdk";

import * as css from './RoomCall.css';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AvatarBase } from '../../components/message';
import { CallErrorCode, CallState, MatrixCall } from 'matrix-js-sdk/lib/webrtc/call';
import { CallFeed } from 'matrix-js-sdk/lib/webrtc/callFeed';
import { SDPStreamMetadataPurpose } from 'matrix-js-sdk/lib/webrtc/callEventTypes';
import { Icon as MDIIcon } from '@mdi/react';
import { mdiMicrophone, mdiMicrophoneOff, mdiPhone, mdiPhoneHangup } from '@mdi/js';
import { translate } from '../../../lang';

// TODO refactor
const styles: Record<CallState | string, CSSProperties> = {
    [CallState.Connected]: {
        opacity: '100%'
    },
    [CallState.Connecting]: {
        borderStyle: 'solid',
        borderWidth: '3px',
        borderColor: '#737373',
        borderRadius: '50%'
    },
    [CallState.Ringing]: {
        opacity: '70%'
    },
    [CallState.InviteSent]: {
        opacity: '70%',
        borderStyle: 'dashed',
        borderWidth: '3px',
        borderColor: '#737373',
        borderRadius: '50%'
    }
};

type RoomCallProps = {
    room: Room;
    call: MatrixCall;
    onHangup: () => void;
    invitation?: boolean;
};

export function RoomCall({ room, call, onHangup, invitation }: RoomCallProps) {
    const mx = useMatrixClient();
    const mxId = mx.getUserId();
    if (typeof mxId !== 'string') return null;
    const user = mx.getUser(mxId);
    if (!user) return null;

    const recipient = mx.getUser(room.getDMInviter() ?? room.guessDMUserId());

    if (!recipient) return;

    const audioRef = useRef<HTMLAudioElement>(null);

    const [userStyle, setUserStyle] = useState<CSSProperties>();
    const [recipientStyle, setRecipientStyle] = useState<CSSProperties>();

    const [recipientShowVideo, setRecipientShowVideo] = useState(false);
    const recipientVideoRef = useRef<HTMLVideoElement>(null);

    const ringtoneRef = useRef<HTMLAudioElement>(null);

    const [isMuted, setMuted] = useState(false);

    const handleHang = useCallback(() => {
        console.debug(`hanging up`, call);
        if (call) {
            call.hangup(CallErrorCode.UserHangup, false);
            for (const feed of call.getLocalFeeds()) {
                feed.dispose();
            }
        }
    }, []);

    const handleMute = useCallback(async () => {
        if (!call) {
            console.debug('No call, dont handling mute');
            return;
        }

        const newState = !call.isMicrophoneMuted();

        call.setMicrophoneMuted(newState);
        setMuted(newState);
    }, []);

    const handleReject = useCallback(async () => {
        if (!call) return;

        try {
            call.reject();
        } catch (err) {

        }

        onHangup();
    }, []);

    const handleAccept = useCallback(async () => {
        if (!call) return;

        await call.answer(true, false);
    }, []);

    console.debug(`Rerendering RoomCall`);

    call.on(CallEvent.FeedsChanged, (feeds: CallFeed[]) => {
        feeds.forEach(feed => {
            if (!feed.isLocal()) {
                const remoteStream = feed.stream;
                console.debug(`REMOTE FEED!!!`, feed);
                if (feed.hasAudioTrack) {
                    if (audioRef.current) {
                        audioRef.current.srcObject = remoteStream;
                        audioRef.current.play().catch(console.error);
                    }
                } else {
                    if (recipientVideoRef.current) {
                        recipientVideoRef.current.srcObject = remoteStream;
                        recipientVideoRef.current.play().catch(console.error);
                        setRecipientShowVideo(true);
                    }
                }
            }
        });
    });

    call.on(CallEvent.State, (state, oldState, call) => {
        updateStyle();
        if (state == CallState.Ended) {
            handleHang();
        }
    });

    call.on(CallEvent.Hangup, () => {
        onHangup();
    });

    const updateStyle = useCallback(() => {
        if (styles[call.state])
            setRecipientStyle(styles[call.state]);
    }, [call]);

    useEffect(() => {
        updateStyle();
    });

    setTimeout(() => {
        if (ringtoneRef.current) ringtoneRef.current.play();
    }, 1000);

    return (
        <Box className={css.RoomCallBox} shrink='No' direction='Column'>
            <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
            {call.state !== CallState.Ringing && (
                <>
                    <Box grow='Yes' direction='Row'>
                        <div className={css.UsersDiv}>
                            <div className={css.UserAvatarBox}>
                                <AvatarBase className={css.UserAvatar}>
                                    <Avatar
                                        style={userStyle}
                                    >
                                        <UserAvatar
                                            userId={user.userId}
                                            alt={user.displayName ?? user.userId}
                                            src={typeof user.avatarUrl === 'string' ? mx.mxcUrlToHttp(user.avatarUrl, 96, 96, 'scale', true) ?? undefined : undefined}
                                            renderFallback={() => <Icon size="200" src={Icons.User} filled />}
                                        />
                                    </Avatar>
                                </AvatarBase>
                            </div>
                            <div className={css.UserAvatarBox}>
                                {recipientShowVideo && (
                                    <video controls={false} autoPlay ref={recipientVideoRef} />
                                )}
                                {!recipientShowVideo && (
                                    <AvatarBase className={css.UserAvatar}>
                                        <Avatar
                                            style={recipientStyle}
                                        >
                                            <UserAvatar
                                                userId={recipient.userId}
                                                alt={recipient.displayName ?? recipient.userId}
                                                src={typeof recipient.avatarUrl === 'string' ? mx.mxcUrlToHttp(recipient.avatarUrl, 96, 96, 'scale', true) ?? undefined : undefined}
                                                renderFallback={() => <Icon size="200" src={Icons.User} filled />}
                                            />
                                        </Avatar>
                                    </AvatarBase>
                                )}
                            </div>
                        </div>
                    </Box>
                    <Box className={css.CallControlsContainer} grow='No' direction='Row'>
                        <IconButton variant='SurfaceVariant' onClick={handleMute} aria-pressed={isMuted}>
                            <MDIIcon path={isMuted ? mdiMicrophoneOff : mdiMicrophone} size={1} />
                        </IconButton>
                        <IconButton variant='Critical' onClick={handleHang}>
                            <MDIIcon path={mdiPhoneHangup} size={1} />
                        </IconButton>
                    </Box>
                </>
            )}
            {
                [CallState.Ringing, CallState.InviteSent, CallState.Connecting].includes(call.state) &&
                (
                    <audio
                        src='https://officialdakari.ru/_matrix/media/r0/download/officialdakari.ru/rAiqpTddZoUUhcBVjPQORWJb'
                        autoPlay
                        loop
                        playsInline
                    />
                )
            }
            {call.state === CallState.Ringing && (
                <>
                    <audio
                        src='https://officialdakari.ru/_matrix/media/r0/download/officialdakari.ru/IthXmyIlDaVKfCIYfMTxNdIG'
                        autoPlay={true}
                        loop={true}
                        ref={ringtoneRef}
                    />
                    <div className={css.UsersDiv}>
                        <Text priority='400' size='H3'>{translate(
                            'title.incoming_call',
                            <b>
                                {recipient.displayName ?? recipient.userId}
                            </b>
                        )}</Text>
                    </div>
                    <Box className={css.CallControlsContainer} grow='No' direction='Row'>
                        <IconButton variant='Success' onClick={handleAccept}>
                            <MDIIcon path={mdiPhone} size={1} />
                        </IconButton>
                        <IconButton variant='Critical' onClick={handleReject}>
                            <MDIIcon path={mdiPhoneHangup} size={1} />
                        </IconButton>
                    </Box>
                </>
            )}
        </Box >
    );
};