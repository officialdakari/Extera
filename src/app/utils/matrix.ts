import {
    EncryptedAttachmentInfo,
    decryptAttachment,
    encryptAttachment,
} from 'browser-encrypt-attachment';
import {
    EventTimeline,
    MatrixClient,
    MatrixError,
    MatrixEvent,
    Room,
    RoomMember,
    RoomType,
    UploadProgress,
    UploadResponse,
} from 'matrix-js-sdk';
import { IImageInfo, IThumbnailContent, IVideoInfo } from '../../types/matrix/common';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getStateEvent } from './room';
import { StateEvent } from '../../types/matrix/room';

export const matchMxId = (id: string): RegExpMatchArray | null =>
    id.match(/^([@!$+#])(\S+):(\S+)$/);

export const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];

export const isUserId = (id: string): boolean => validMxId(id) && id.startsWith('@');

export const isRoomId = (id: string): boolean => validMxId(id) && id.startsWith('!');

export const isRoomAlias = (id: string): boolean => validMxId(id) && id.startsWith('#');

export const parseMatrixToUrl = (url: string): [string | undefined, string | undefined] => {
    const href = decodeURIComponent(url);

    const match = href.match(/^https?:\/\/matrix.to\/#\/([@!$+#]\S+:[^\\?|^\s|^\\/]+)(\?(via=\S+))?/);
    if (!match) return [undefined, undefined];
    const [, g1AsMxId, , g3AsVia] = match;
    return [g1AsMxId, g3AsVia];
};

export const getCanonicalAliasRoomId = (mx: MatrixClient, alias: string): string | undefined =>
    mx.getRooms()?.find((room) => room.getCanonicalAlias() === alias)?.roomId;

export const getCanonicalAliasOrRoomId = (mx: MatrixClient, roomId: string): string =>
    mx.getRoom(roomId)?.getCanonicalAlias() || roomId;

export const getRoomNameOrId = (mx: MatrixClient, roomId: string): string =>
    mx.getRoom(roomId)?.name || roomId;

export const getRoomTopic = (mx: MatrixClient, room: Room): string | undefined => {
    const topicEvent = getStateEvent(room, StateEvent.RoomTopic);
    if (!topicEvent) return;
    const content = topicEvent.getContent();
    return typeof content.topic === 'string' ? content.topic : undefined;
};

export const getImageInfo = (img: HTMLImageElement, fileOrBlob: File | Blob): IImageInfo => {
    const info: IImageInfo = {};
    info.w = img.width;
    info.h = img.height;
    info.mimetype = fileOrBlob.type;
    info.size = fileOrBlob.size;
    return info;
};

export const searchRoom = (mx: MatrixClient, term: string): Room[] => {
    const rooms: Room[] = [];
    term = term.toLowerCase();
    for (const room of mx.getRooms()) {
        const topic = getRoomTopic(mx, room)?.toLowerCase() || '';
        if (room.name.toLowerCase().includes(term) || term.includes(room.name.toLowerCase())
            || (topic && (topic?.includes(term) || term.includes(topic)))) {
            rooms.push(room);
        }
    }
    return rooms;
};

export const getVideoInfo = (video: HTMLVideoElement, fileOrBlob: File | Blob): IVideoInfo => {
    const info: IVideoInfo = {};
    info.duration = Number.isNaN(video.duration) ? undefined : Math.floor(video.duration * 1000);
    info.w = video.videoWidth;
    info.h = video.videoHeight;
    info.mimetype = fileOrBlob.type;
    info.size = fileOrBlob.size;
    return info;
};

export const getThumbnailContent = (thumbnailInfo: {
    thumbnail: File | Blob;
    encInfo: EncryptedAttachmentInfo | undefined;
    mxc: string;
    width: number;
    height: number;
}): IThumbnailContent => {
    const { thumbnail, encInfo, mxc, width, height } = thumbnailInfo;

    const content: IThumbnailContent = {
        thumbnail_info: {
            mimetype: thumbnail.type,
            size: thumbnail.size,
            w: width,
            h: height,
        },
    };
    if (encInfo) {
        content.thumbnail_file = {
            ...encInfo,
            url: mxc,
        };
    } else {
        content.thumbnail_url = mxc;
    }
    return content;
};

export const encryptFile = async (
    file: File | Blob
): Promise<{
    encInfo: EncryptedAttachmentInfo;
    file: File;
    originalFile: File | Blob;
}> => {
    const dataBuffer = await file.arrayBuffer();
    const encryptedAttachment = await encryptAttachment(dataBuffer);
    // cordova overrides window.File so we need to do this trick
    const encFile = new Blob([encryptedAttachment.data], {
        type: file.type
    });
    // @ts-ignore
    encFile.lastModified = new Date();
    // @ts-ignore
    encFile.lastModifiedDate = new Date();
    // @ts-ignore
    encFile.name = file.name;
    return {
        encInfo: encryptedAttachment.info,
        // @ts-ignore
        file: encFile,
        originalFile: file,
    };
};

export const decryptFile = async (
    dataBuffer: ArrayBuffer,
    type: string,
    encInfo: EncryptedAttachmentInfo
): Promise<Blob> => {
    const dataArray = await decryptAttachment(dataBuffer, encInfo);
    const blob = new Blob([dataArray], { type });
    return blob;
};

export type TUploadContent = File | Blob;

export type ContentUploadOptions = {
    name?: string;
    fileType?: string;
    hideFilename?: boolean;
    onPromise?: (promise: Promise<UploadResponse>) => void;
    onProgress?: (progress: UploadProgress) => void;
    onSuccess: (mxc: string) => void;
    onError: (error: MatrixError) => void;
};

export const uploadContent = async (
    mx: MatrixClient,
    file: TUploadContent,
    options: ContentUploadOptions
) => {
    const { name, fileType, hideFilename, onProgress, onPromise, onSuccess, onError } = options;

    const uploadPromise = mx.uploadContent(file, {
        name,
        type: fileType,
        includeFilename: !hideFilename,
        progressHandler: onProgress,
    });
    onPromise?.(uploadPromise);
    try {
        const data = await uploadPromise;
        const mxc = data.content_uri;
        if (mxc) onSuccess(mxc);
        else onError(new MatrixError(data));
    } catch (e: any) {
        const error = typeof e?.message === 'string' ? e.message : undefined;
        const errcode = typeof e?.name === 'string' ? e.message : undefined;
        onError(new MatrixError({ error, errcode }));
    }
};

export const matrixEventByRecency = (m1: MatrixEvent, m2: MatrixEvent) => m2.getTs() - m1.getTs();

export const factoryEventSentBy = (senderId: string) => (ev: MatrixEvent) =>
    ev.getSender() === senderId;

export const eventWithShortcode = (ev: MatrixEvent) =>
    typeof ev.getContent().shortcode === 'string';

export const getDMRoomFor = (mx: MatrixClient, userId: string): Room | undefined => {
    const dmLikeRooms = mx
        .getRooms()
        .filter((room) => mx.isRoomEncrypted(room.roomId) && room.getMembers().length <= 2);

    return dmLikeRooms.find((room) => room.getMember(userId));
};

export const guessDmRoomUserId = (room: Room, myUserId: string): string => {
    const getOldestMember = (members: RoomMember[]): RoomMember | undefined => {
        let oldestMemberTs: number | undefined;
        let oldestMember: RoomMember | undefined;

        const pickOldestMember = (member: RoomMember) => {
            if (member.userId === myUserId) return;

            if (
                oldestMemberTs === undefined ||
                (member.events.member && member.events.member.getTs() < oldestMemberTs)
            ) {
                oldestMember = member;
                oldestMemberTs = member.events.member?.getTs();
            }
        };

        members.forEach(pickOldestMember);

        return oldestMember;
    };

    // Pick the joined user who's been here longest (and isn't us),
    const member = getOldestMember(room.getJoinedMembers());
    if (member) return member.userId;

    // if there are no joined members other than us, use the oldest member
    const member1 = getOldestMember(room.currentState.getMembers());
    return member1?.userId ?? myUserId;
};

export const addRoomIdToMDirect = async (
    mx: MatrixClient,
    roomId: string,
    userId: string
): Promise<void> => {
    const mDirectsEvent = mx.getAccountData(AccountDataEvent.Direct);
    const userIdToRoomIds: Record<string, string[]> = mDirectsEvent?.getContent() ?? {};

    // remove it from the lists of any others users
    // (it can only be a DM room for one person)
    Object.keys(userIdToRoomIds).forEach((targetUserId) => {
        const roomIds = userIdToRoomIds[targetUserId];

        if (targetUserId !== userId) {
            const indexOfRoomId = roomIds.indexOf(roomId);
            if (indexOfRoomId > -1) {
                roomIds.splice(indexOfRoomId, 1);
            }
        }
    });

    const roomIds = userIdToRoomIds[userId] || [];
    if (roomIds.indexOf(roomId) === -1) {
        roomIds.push(roomId);
    }
    userIdToRoomIds[userId] = roomIds;

    await mx.setAccountData(AccountDataEvent.Direct, userIdToRoomIds);
};

export const removeRoomIdFromMDirect = async (mx: MatrixClient, roomId: string): Promise<void> => {
    const mDirectsEvent = mx.getAccountData(AccountDataEvent.Direct);
    const userIdToRoomIds: Record<string, string[]> = mDirectsEvent?.getContent() ?? {};

    Object.keys(userIdToRoomIds).forEach((targetUserId) => {
        const roomIds = userIdToRoomIds[targetUserId];
        const indexOfRoomId = roomIds.indexOf(roomId);
        if (indexOfRoomId > -1) {
            roomIds.splice(indexOfRoomId, 1);
        }
    });

    await mx.setAccountData(AccountDataEvent.Direct, userIdToRoomIds);
};

export const mxcUrlToHttp = (mx: MatrixClient, mxcUrl: string, width?: number, height?: number, resizeMethod?: 'crop' | 'scale', doNotAuthenticate?: boolean, allowDirect?: boolean) => {
    return mx.mxcUrlToHttp(mxcUrl, width, height, resizeMethod, allowDirect, true, !doNotAuthenticate);
};

export const getRoomTags = (mx: MatrixClient, room: Room) => {
    const tagEvent = room.getAccountData('m.tag');
    if (!tagEvent) return {};
    const content = tagEvent.getContent();
    return content['tags'];
}