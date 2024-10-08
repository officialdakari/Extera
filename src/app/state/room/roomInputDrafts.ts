import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { TListAtom, createListAtom } from '../list';
import { createUploadAtomFamily } from '../upload';
import { TUploadContent } from '../../utils/matrix';

export const roomUploadAtomFamily = createUploadAtomFamily();

export type TUploadItem = {
    file: TUploadContent;
    originalFile: TUploadContent;
    encInfo: EncryptedAttachmentInfo | undefined;
    hideReason?: string | undefined;
};

export const roomIdToUploadItemsAtomFamily = atomFamily<string, TListAtom<TUploadItem>>(
    createListAtom
);

export type RoomIdToMsgAction =
    | {
        type: 'PUT';
        roomId: string;
        msg: string;
    }
    | {
        type: 'DELETE';
        roomId: string;
    };

const createMsgDraftAtom = () => atom<string>('');
export type TMsgDraftAtom = ReturnType<typeof createMsgDraftAtom>;
export const roomIdToMsgDraftAtomFamily = atomFamily<string, TMsgDraftAtom>(() =>
    createMsgDraftAtom()
);

export type IReplyDraft = {
    userId: string;
    eventId: string;
    body: string;
    formattedBody?: string;
};
const createReplyDraftAtom = () => atom<IReplyDraft | undefined>(undefined);
export type TReplyDraftAtom = ReturnType<typeof createReplyDraftAtom>;
export const roomIdToReplyDraftAtomFamily = atomFamily<string, TReplyDraftAtom>(() =>
    createReplyDraftAtom()
);
