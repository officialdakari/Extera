import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { Avatar, Box, IconButton, Text } from "folds";
import { CallEvent, Room } from "matrix-js-sdk";

import * as css from './RoomCall.css';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AvatarBase } from '../../components/message';
import { CallErrorCode, CallState, MatrixCall } from 'matrix-js-sdk/lib/webrtc/call';
import { CallFeed } from 'matrix-js-sdk/lib/webrtc/callFeed';
import Icon, { Icon as MDIcon } from '@mdi/react';
import { mdiAccount, mdiMicrophone, mdiMicrophoneOff, mdiPhone, mdiPhoneHangup, mdiVideo, mdiVideoOff } from '@mdi/js';
import { translate } from '../../../lang';
import { mxcUrlToHttp } from '../../utils/matrix';

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
    video?: boolean;
};

export function RoomCall({ room, call, onHangup, invitation, video }: RoomCallProps) {
    const mx = useMatrixClient();
    const mxId = mx.getUserId();
    if (typeof mxId !== 'string') return null;
    const user = mx.getUser(mxId);
    if (!user) return null;

    const recipient = mx.getUser(room.getDMInviter() ?? room.guessDMUserId());

    if (!recipient) return;

    const audioRef = useRef<HTMLAudioElement>(null);
    const [recipientStyle, setRecipientStyle] = useState<CSSProperties>();

    const [recipientShowVideo, setRecipientShowVideo] = useState(false);
    const recipientVideoRef = useRef<HTMLVideoElement>(null);

    const [localShowVideo, setLocalShowVideo] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const ringtoneRef = useRef<HTMLAudioElement>(null);

    const [isMuted, setMuted] = useState(false);
    const [isVideoMuted, setVideoMuted] = useState(false);

    const handleHang = useCallback(() => {
        if (call) {
            call.hangup(CallErrorCode.UserHangup, false);
            for (const feed of call.getLocalFeeds()) {
                feed.dispose();
            }
        }
    }, []);

    const handleMute = useCallback(async () => {
        if (!call) {
            return;
        }

        const newState = !call.isMicrophoneMuted();

        call.setMicrophoneMuted(newState);
        setMuted(newState);
    }, []);

    const handleVideoMute = useCallback(async () => {
        if (!call) {
            return;
        }

        const newState = !call.isLocalVideoMuted();

        call.setLocalVideoMuted(newState);
        setVideoMuted(newState);
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
        if (video) {
            call.setLocalVideoMuted(true);
        }
    }, []);

    const handleVideoAccept = useCallback(async () => {
        if (!call) return;

        await call.answer(true, true);
    }, []);

    call.on(CallEvent.FeedsChanged, (feeds: CallFeed[]) => {
        feeds.forEach(feed => {
            const remoteStream = feed.stream;
            if (feed.isLocal()) {
                if (!feed.isVideoMuted()) {
                    setLocalShowVideo(true);
                    setTimeout(() => {
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = remoteStream;
                            localVideoRef.current.play().catch(console.error);
                        }
                    }, 1000);
                }
            } else {
                if (feed.hasAudioTrack) {
                    if (audioRef.current) {
                        audioRef.current.srcObject = remoteStream;
                        audioRef.current.play().catch(console.error);
                    }
                }
                if (!feed.isVideoMuted()) {
                    setRecipientShowVideo(true);
                    setTimeout(() => {
                        if (recipientVideoRef.current) {
                            recipientVideoRef.current.srcObject = remoteStream;
                            recipientVideoRef.current.play().catch(console.error);
                        }
                    }, 1000);
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
                                <video controls={false} autoPlay className={css.VideoFeed} style={{ display: localShowVideo ? 'block' : 'none' }} ref={localVideoRef} />
                                {!localShowVideo && (
                                    <AvatarBase className={css.UserAvatar}>
                                        <Avatar>
                                            <UserAvatar
                                                userId={user.userId}
                                                alt={user.displayName ?? user.userId}
                                                src={typeof user.avatarUrl === 'string' ? mxcUrlToHttp(mx, user.avatarUrl, 96, 96, 'scale') ?? undefined : undefined}
                                            />
                                        </Avatar>
                                    </AvatarBase>
                                )}
                            </div>
                            <div className={css.UserAvatarBox}>
                                <video controls={false} autoPlay className={css.VideoFeed} style={{ display: recipientShowVideo ? 'block' : 'none' }} ref={recipientVideoRef} />
                                {!recipientShowVideo && (
                                    <AvatarBase className={css.UserAvatar}>
                                        <Avatar
                                            style={recipientStyle}
                                        >
                                            <UserAvatar
                                                userId={recipient.userId}
                                                alt={recipient.displayName ?? recipient.userId}
                                                src={typeof recipient.avatarUrl === 'string' ? mxcUrlToHttp(mx, recipient.avatarUrl, 96, 96, 'scale') ?? undefined : undefined}
                                            />
                                        </Avatar>
                                    </AvatarBase>
                                )}
                            </div>
                        </div>
                    </Box>
                    <Box className={css.CallControlsContainer} grow='No' direction='Row'>
                        <IconButton variant='SurfaceVariant' onClick={handleVideoMute} aria-pressed={isVideoMuted}>
                            <MDIcon path={isVideoMuted ? mdiVideoOff : mdiVideo} size={1} />
                        </IconButton>
                        <IconButton variant='SurfaceVariant' onClick={handleMute} aria-pressed={isMuted}>
                            <MDIcon path={isMuted ? mdiMicrophoneOff : mdiMicrophone} size={1} />
                        </IconButton>
                        <IconButton variant='Critical' onClick={handleHang}>
                            <MDIcon path={mdiPhoneHangup} size={1} />
                        </IconButton>
                    </Box>
                </>
            )}
            {
                [CallState.InviteSent, CallState.Connecting].includes(call.state) &&
                (
                    <audio
                        src='/ring.mp3'
                        autoPlay
                        loop
                        playsInline
                    />
                )
            }
            {call.state === CallState.Ringing && (
                <>
                    <audio
                        src='/incoming.mp3'
                        autoPlay={true}
                        loop={true}
                        ref={ringtoneRef}
                    />
                    <div className={css.UsersDiv}>
                        <Text priority='400' size='H3'>{translate(
                            video ? 'title.incoming_video_call' : 'title.incoming_call',
                            <b>
                                {recipient.displayName ?? recipient.userId}
                            </b>
                        )}</Text>
                    </div>
                    {video && (
                        <div>
                            <Text style={{ color: 'red' }}>
                                <b>ATTENTION!</b> Due to a bug, recipient <i>will see your video feed</i> for less than a second, and then it will be <i>frozen picture</i> (Not blank screen, but a frozen picture!)
                            </Text>
                        </div>
                    )}
                    <Box className={css.CallControlsContainer} grow='No' direction='Row'>
                        {video && (
                            <IconButton variant='Success' onClick={handleVideoAccept}>
                                <MDIcon path={mdiVideo} size={1} />
                            </IconButton>
                        )}
                        <IconButton variant='Success' onClick={handleAccept}>
                            <MDIcon path={mdiPhone} size={1} />
                        </IconButton>
                        <IconButton variant='Critical' onClick={handleReject}>
                            <MDIcon path={mdiPhoneHangup} size={1} />
                        </IconButton>
                    </Box>
                </>
            )}
        </Box >
    );
};