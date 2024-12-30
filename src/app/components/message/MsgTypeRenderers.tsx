import React, { ReactNode, useRef } from 'react';
import { Box, Chip, Text, toRem } from 'folds';
import { IContent, MatrixEvent } from 'matrix-js-sdk';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { trimReplyFromBody } from '../../utils/room';
import { MessageTextBody } from './layout';
import {
    MessageBadEncryptedContent,
    MessageBlockedContent,
    MessageBrokenContent,
    MessageDeletedContent,
    MessageEditedContent,
    MessageUnsupportedContent,
    PollContent
} from './content';
import {
    IAudioContent,
    IAudioInfo,
    IEncryptedFile,
    IFileContent,
    IFileInfo,
    IImageContent,
    IImageInfo,
    IThumbnailContent,
    IVideoContent,
    IVideoInfo,
} from '../../../types/matrix/common';
import { FALLBACK_MIMETYPE, getBlobSafeMimeType } from '../../utils/mimeTypes';
import { parseGeoUri, scaleYDimension } from '../../utils/common';
import { Attachment, AttachmentBox, AttachmentContent, AttachmentHeader } from './attachment';
import { FileHeader } from './FileHeader';
import { HTMLReactParserOptions } from 'html-react-parser';
import { RenderBody } from './RenderBody';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiOpenInNew } from '@mdi/js';
import { AppBar, Button, DialogActions, DialogContent, Toolbar, Typography } from '@mui/material';
import { OpenInNew, TravelExplore } from '@mui/icons-material';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

import "leaflet/dist/leaflet.css";
import { openReusableDialog } from '../../../client/action/navigation';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

export function MBadEncrypted() {
    return (
        <Text>
            <MessageBadEncryptedContent />
        </Text>
    );
}

type RedactedContentProps = {
    reason?: string;
};
export function RedactedContent({ reason }: RedactedContentProps) {
    return (
        <Text>
            <MessageDeletedContent reason={reason} />
        </Text>
    );
}

export function BlockedContent() {
    return (
        <Text>
            <MessageBlockedContent />
        </Text>
    );
}

export function UnsupportedContent() {
    return (
        <Text>
            <MessageUnsupportedContent />
        </Text>
    );
}

export function BrokenContent() {
    return (
        <Text>
            <MessageBrokenContent />
        </Text>
    );
}

type RenderBodyProps = {
    body: string;
    customBody?: string;
};
type MTextProps = {
    edited?: boolean;
    content: Record<string, unknown>;
    renderBody: (props: RenderBodyProps) => ReactNode;
    renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MText({ edited, content, renderBody, renderUrlsPreview }: MTextProps) {
    const { body, formatted_body: customBody } = content;

    if (typeof body !== 'string') return <BrokenContent />;
    const trimmedBody = trimReplyFromBody(body);
    const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
    const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;
    const [messageLayout] = useSetting(settingsAtom, 'messageLayout');

    return (
        <>
            <MessageTextBody
                preWrap={typeof customBody !== 'string'}
                jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
            >
                {renderBody({
                    body: trimmedBody,
                    customBody: typeof customBody === 'string' ? customBody : undefined,
                })}
                {messageLayout !== 2 && edited && <MessageEditedContent />}
            </MessageTextBody>
            {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
        </>
    );
}

type MPollProps = {
    edited?: boolean;
    content: Record<string, unknown>;
    event: MatrixEvent;
};
export function MPoll({ edited, content, event }: MPollProps) {

    if (!content['org.matrix.msc3381.poll.start']) return <BrokenContent />;

    return (
        <PollContent
            content={content}
            event={event}
        />
    );
}

type MEmoteProps = {
    displayName: string;
    edited?: boolean;
    content: Record<string, unknown>;
    renderBody: (props: RenderBodyProps) => ReactNode;
    renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MEmote({
    displayName,
    edited,
    content,
    renderBody,
    renderUrlsPreview,
}: MEmoteProps) {
    const { body, formatted_body: customBody } = content;

    if (typeof body !== 'string') return <BrokenContent />;
    const trimmedBody = trimReplyFromBody(body);
    const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
    const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

    return (
        <>
            <MessageTextBody
                emote
                preWrap={typeof customBody !== 'string'}
                jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
            >
                <b>{`${displayName} `}</b>
                {renderBody({
                    body: trimmedBody,
                    customBody: typeof customBody === 'string' ? customBody : undefined,
                })}
            </MessageTextBody>
            {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
        </>
    );
}

type MNoticeProps = {
    edited?: boolean;
    content: Record<string, unknown>;
    renderBody: (props: RenderBodyProps) => ReactNode;
    renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MNotice({ edited, content, renderBody, renderUrlsPreview }: MNoticeProps) {
    const { body, formatted_body: customBody } = content;

    if (typeof body !== 'string') return <BrokenContent />;
    const trimmedBody = trimReplyFromBody(body);
    const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
    const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

    return (
        <>
            <MessageTextBody
                notice
                preWrap={typeof customBody !== 'string'}
                jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
            >
                {renderBody({
                    body: trimmedBody,
                    customBody: typeof customBody === 'string' ? customBody : undefined,
                })}
            </MessageTextBody>
            {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
        </>
    );
}

type RenderImageContentProps = {
    body: string;
    filename?: string,
    format?: string,
    formatted_body?: string,
    info?: IImageInfo & IThumbnailContent;
    mimeType?: string;
    url: string;
    encInfo?: IEncryptedFile;
};
type MImageProps = {
    content: IImageContent;
    renderBody: (props: RenderBodyProps) => ReactNode;
    renderImageContent: (props: RenderImageContentProps) => ReactNode;
    outlined?: boolean;
};
export function MImage({ content, renderImageContent, renderBody, outlined }: MImageProps) {
    const imgInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;
    if (typeof mxcUrl !== 'string') {
        return <BrokenContent />;
    }
    const height = scaleYDimension(imgInfo?.w || 400, 400, imgInfo?.h || 400);
    const attachmentRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Attachment ref={attachmentRef} >
                <AttachmentBox
                    style={{
                        height: toRem(height < 48 ? 48 : height),
                    }}
                >
                    {renderImageContent({
                        body: content.body || 'Image',
                        filename: content.filename,
                        formatted_body: content.formatted_body,
                        format: content.format,
                        info: imgInfo,
                        mimeType: imgInfo?.mimetype,
                        url: mxcUrl,
                        encInfo: content.file,
                    })}
                </AttachmentBox>
            </Attachment>
            {content.body && content.filename && (
                <MessageTextBody
                    preWrap={typeof content.formatted_body !== 'string'}
                    style={{ maxWidth: `${attachmentRef.current?.clientWidth ?? 400}px` }}>
                    {renderBody({
                        body: content.body,
                        customBody: content.format == 'org.matrix.custom.html' ? content.formatted_body : undefined
                    })}
                </MessageTextBody>
            )}
        </>
    );
}

type RenderVideoContentProps = {
    body: string;
    info: IVideoInfo & IThumbnailContent;
    mimeType: string;
    url: string;
    encInfo?: IEncryptedFile;
};
type MVideoProps = {
    content: IVideoContent;
    renderAsFile: () => ReactNode;
    renderVideoContent: (props: RenderVideoContentProps) => ReactNode;
    renderBody: (props: RenderBodyProps) => ReactNode;
    outlined?: boolean;
};
export function MVideo({ content, renderAsFile, renderVideoContent, renderBody, outlined }: MVideoProps) {
    const videoInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;
    const safeMimeType = getBlobSafeMimeType(videoInfo?.mimetype ?? '');

    if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
        if (mxcUrl) {
            return renderAsFile();
        }
        return <BrokenContent />;
    }

    const height = scaleYDimension(videoInfo.w || 400, 400, videoInfo.h || 400);
    const attachmentRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Attachment ref={attachmentRef} >
                <AttachmentBox
                    style={{
                        height: toRem(height < 48 ? 48 : height),
                    }}
                >
                    {renderVideoContent({
                        body: content.body || 'Video',
                        info: videoInfo,
                        mimeType: safeMimeType,
                        url: mxcUrl,
                        encInfo: content.file,
                    })}
                </AttachmentBox>
            </Attachment>

            {content.body && content.filename && (
                <MessageTextBody
                    preWrap={typeof content.formatted_body !== 'string'}
                    style={{ maxWidth: `${attachmentRef.current?.clientWidth ?? 400}px` }}>
                    {renderBody({
                        body: content.body,
                        customBody: content.format == 'org.matrix.custom.html' ? content.formatted_body : undefined
                    })}
                </MessageTextBody>
            )}
        </>
    );
}

type RenderAudioContentProps = {
    info: IAudioInfo;
    mimeType: string;
    url: string;
    encInfo?: IEncryptedFile;
};
type MAudioProps = {
    content: IAudioContent;
    renderAsFile: () => ReactNode;
    renderBody: (props: RenderBodyProps) => ReactNode;
    renderAudioContent: (props: RenderAudioContentProps) => ReactNode;
    outlined?: boolean;
    voiceMessage?: boolean;
};
export function MAudio({ content, renderAsFile, renderAudioContent, renderBody, voiceMessage, outlined }: MAudioProps) {
    const audioInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;
    const safeMimeType = getBlobSafeMimeType(audioInfo?.mimetype ?? '');

    if (!audioInfo || !safeMimeType.startsWith('audio') || typeof mxcUrl !== 'string') {
        if (mxcUrl) {
            return renderAsFile();
        }
        return <BrokenContent />;
    }

    const attachmentRef = useRef<HTMLDivElement>(null);

    return voiceMessage ? (
        <div style={{ margin: '5px' }}>
            {renderAudioContent({
                info: audioInfo,
                mimeType: safeMimeType,
                url: mxcUrl,
                encInfo: content.file,
            })}
        </div>
    ) : (
        <>
            <Attachment ref={attachmentRef} >
                <AttachmentHeader>
                    <FileHeader body={content.filename ?? content.body ?? 'Audio'} mimeType={safeMimeType} />
                </AttachmentHeader>
                <AttachmentBox>
                    <AttachmentContent>
                        {renderAudioContent({
                            info: audioInfo,
                            mimeType: safeMimeType,
                            url: mxcUrl,
                            encInfo: content.file,
                        })}
                    </AttachmentContent>
                </AttachmentBox>
            </Attachment>
            {content.body && content.filename && (
                <MessageTextBody
                    preWrap={typeof content.formatted_body !== 'string'}
                    style={{ maxWidth: `${attachmentRef.current?.clientWidth ?? 400}px` }}>
                    {renderBody({
                        body: content.body,
                        customBody: content.format == 'org.matrix.custom.html' ? content.formatted_body : undefined
                    })}
                </MessageTextBody>
            )}
        </>
    );
}

type RenderFileContentProps = {
    body: string;
    info: IFileInfo & IThumbnailContent;
    mimeType: string;
    url: string;
    encInfo?: IEncryptedFile;
    format?: string;
    formatted_body?: string;
    filename?: string;
    htmlReactParserOptions: HTMLReactParserOptions;
};
type MFileProps = {
    content: IFileContent;
    renderFileContent: (props: RenderFileContentProps) => ReactNode;
    renderBody: (props: RenderBodyProps) => ReactNode;
    outlined?: boolean;
    htmlReactParserOptions: HTMLReactParserOptions;
};
export function MFile({ content, renderFileContent, renderBody, outlined, htmlReactParserOptions }: MFileProps) {
    const fileInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;

    if (typeof mxcUrl !== 'string') {
        return <BrokenContent />;
    }

    const attachmentRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Attachment ref={attachmentRef} >
                <AttachmentHeader>
                    <FileHeader
                        body={content.filename ?? content.body ?? 'Unnamed File'}
                        mimeType={fileInfo?.mimetype ?? FALLBACK_MIMETYPE}
                    />
                </AttachmentHeader>
                <AttachmentBox>
                    <AttachmentContent>
                        {renderFileContent({
                            body: content.body ?? 'File',
                            info: fileInfo ?? {},
                            mimeType: fileInfo?.mimetype ?? FALLBACK_MIMETYPE,
                            url: mxcUrl,
                            encInfo: content.file,
                            format: content.format,
                            formatted_body: content.formatted_body,
                            filename: content.filename,
                            htmlReactParserOptions
                        })}
                    </AttachmentContent>
                </AttachmentBox>
            </Attachment>

            {content.body && content.filename && (
                <MessageTextBody
                    preWrap={typeof content.formatted_body !== 'string'}
                    style={{ maxWidth: `${attachmentRef.current?.clientWidth ?? 400}px` }}>
                    {renderBody({
                        body: content.body,
                        customBody: content.format == 'org.matrix.custom.html' ? content.formatted_body : undefined
                    })}
                </MessageTextBody>
            )}
        </>
    );
}

type MLocationProps = {
    content: IContent;
};
export function MLocation({ content }: MLocationProps) {
    const geoUri = content.geo_uri;
    if (typeof geoUri !== 'string') return <BrokenContent />;
    const location = parseGeoUri(geoUri);
    const pos = {
        lat: parseInt(location.latitude),
        lng: parseInt(location.longitude)
    };
    const openDialog = () => {
        openReusableDialog(
            getText('title.map'),
            (requestClose: () => void) => (
                <>
                    <DialogContent>
                        <MapContainer style={{ width: '100%', height: '600px' }} center={[pos.lat, pos.lng]} zoom={13} scrollWheelZoom>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={pos} />
                        </MapContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={requestClose}>{getText('btn.close')}</Button>
                    </DialogActions>
                </>
            ),
            null,
            () => (
                {
                    fullScreen: true
                }
            )
        );
    };

    return (
        <Box direction="Column" alignItems="Start" gap="100">
            <Button
                onClick={openDialog}
                variant="contained"
                startIcon={<TravelExplore />}
                size='small'
                fullWidth
            >
                {getText('btn.open_location')}
            </Button>
            <Button
                href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
                target="_blank"
                rel="noreferrer noopener"
                variant="outlined"
                color='secondary'
                startIcon={<OpenInNew />}
                size='small'
                fullWidth
            >
                {getText('btn.open_location_in_new')}
            </Button>
        </Box>
    );
}

type MStickerProps = {
    content: IImageContent;
    renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MSticker({ content, renderImageContent }: MStickerProps) {
    const imgInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;
    if (typeof mxcUrl !== 'string') {
        return <MessageBrokenContent />;
    }
    const height = scaleYDimension(imgInfo?.w || 152, 152, imgInfo?.h || 152);

    return (
        <AttachmentBox
            style={{
                height: toRem(height < 48 ? 48 : height),
                width: toRem(152),
            }}
        >
            {renderImageContent({
                body: content.body || 'Sticker',
                info: imgInfo,
                mimeType: imgInfo?.mimetype,
                url: mxcUrl,
                encInfo: content.file,
            })}
        </AttachmentBox>
    );
}
