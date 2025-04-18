/* eslint-disable jsx-a11y/media-has-caption */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Box, Text } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import Icon from '@mdi/react';
import { mdiPause, mdiPlay } from '@mdi/js';
import { CircularProgress, IconButton, Slider, useTheme } from '@mui/material';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getFileSrcUrl } from './util';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
    PlayTimeCallback,
    useMediaLoading,
    useMediaPlay,
    useMediaPlayTimeCallback,
    useMediaSeek,
} from '../../../hooks/media';
import { useThrottle } from '../../../hooks/useThrottle';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import { mxcUrlToHttp } from '../../../utils/matrix';

const PLAY_TIME_THROTTLE_OPS = {
    wait: 500,
    immediate: true,
};

type RenderMediaControlProps = {
    after: ReactNode;
    leftControl?: ReactNode;
    rightControl?: ReactNode;
    children: ReactNode;
};
export type VoiceContentProps = {
    mimeType: string;
    url: string;
    info: IAudioInfo;
    encInfo?: EncryptedAttachmentInfo;
    renderMediaControl: (props: RenderMediaControlProps) => ReactNode;
};
export function VoiceContent({
    mimeType,
    url,
    info,
    encInfo,
    renderMediaControl,
}: VoiceContentProps) {
    const mx = useMatrixClient();
    const theme = useTheme();

    const [srcState, loadSrc] = useAsyncCallback(
        useCallback(
            () => getFileSrcUrl(mxcUrlToHttp(mx, url) ?? '', mimeType, encInfo, mx, !('cordova' in window)),
            [mx, url, mimeType, encInfo]
        )
    );

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [currentTime, setCurrentTime] = useState(0);
    // duration in seconds. (NOTE: info.duration is in milliseconds)
    const infoDuration = info.duration ?? 0;
    const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

    const getAudioRef = useCallback(() => audioRef.current, []);
    const { loading } = useMediaLoading(getAudioRef);
    const { playing, setPlaying } = useMediaPlay(getAudioRef);
    const { seek } = useMediaSeek(getAudioRef);
    // const { volume, mute, setMute, setVolume } = useMediaVolume(getAudioRef);
    const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
        setDuration(d);
        setCurrentTime(ct);
    }, []);
    useMediaPlayTimeCallback(
        getAudioRef,
        useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPS)
    );

    const handlePlay = () => {
        if (srcState.status === AsyncStatus.Success) {
            setPlaying(!playing);
        } else if (srcState.status !== AsyncStatus.Loading) {
            loadSrc();
        }
    };

    return renderMediaControl({
        after: (
            <Box direction='Row' grow='Yes' alignItems='Center' style={{ width: '200px', gap: theme.spacing(2) }}>
                <IconButton
                    sx={{ bgcolor: 'background.paper' }}
                    onClick={handlePlay}
                    disabled={srcState.status === AsyncStatus.Loading}
                >
                    {
                        srcState.status === AsyncStatus.Loading || loading ? (
                            <CircularProgress />
                        ) : (
                            <Icon size={1} path={playing ? mdiPause : mdiPlay} />
                        )
                    }
                </IconButton>
                <Slider
                    step={1}
                    min={0}
                    max={duration || 1}
                    value={currentTime}
                    onChange={(evt, value) => seek(value as number)}
                    size='small'
                />
                <Text size="T200">{`${secondsToMinutesAndSeconds(
                    srcState.status === AsyncStatus.Idle ? duration : currentTime
                )}`}</Text>
            </Box >
        ),
        children: (
            <audio controls={false} autoPlay ref={audioRef}>
                {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
            </audio>
        ),
    });
}
