import { sanitizeText } from '../../utils/sanitize';
import { parseBlockMD, parseInlineMD } from '../../plugins/markdown';
import { findAndReplace } from '../../utils/findAndReplace';
import { v4 } from 'uuid';
import { getCanonicalAliasRoomId, getRoomNameOrId } from '../../utils/matrix';
import initMatrix from '../../../client/initMatrix';

export type OutputOptions = {
    allowTextFormatting?: boolean;
    allowInlineMarkdown?: boolean;
    allowBlockMarkdown?: boolean;
};

const HTML_TAG_REG_G = /<([\w-]+)(?: [^>]*)?(?:(?:\/>)|(?:>.*?<\/\1>))/g;
const ignoreHTMLParseInlineMD = (text: string): string =>
    findAndReplace(
        text,
        HTML_TAG_REG_G,
        (match) => match[0],
        (txt) => parseInlineMD(txt)
    ).join('');

export const emojiRegexp = /{:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):}/g;
export const userMentionRegexp = /{(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})}/gi;
export const roomMentionRegexp = /{([#!][^}:]+:[a-z0-9\.\-]+\.[a-z]{2,})}/gi;
export const anyTagRegexp = /{(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))}/gi;
export const deleteEndRegexp = /{(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))([^}]|$)/gi;
export const deleteStartRegexp = /(^|[^{])(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))}/gi;
export const everyoneMentionRegexp = /{@room}/g;

export const toMatrixCustomHTML = (
    content: string,
    getDisplayName: any
): string => {
    const table: Record<string, string> = {};
    var str = parseBlockMD(
        sanitizeText(content)
            // TODO move that to markdown.ts
            .replaceAll(emojiRegexp, (match: string, shortcode: string, mxc: string) => {
                const id = `{[${v4()}]}`;
                table[id] = `<img data-mx-emoticon height="32" src="${mxc}" alt=":${shortcode}:" title=":${shortcode}:">`;
                return id;
            })
            .replaceAll(userMentionRegexp, (match: string, mxId: string) => {
                const id = `{[${v4()}]}`;
                table[id] = `<a href="https://matrix.to/#/${mxId}">${getDisplayName(mxId)}</a>`;
                return id;
            })
            .replaceAll(roomMentionRegexp, (match: string, id: string) => {
                const oid = `{[${v4()}]}`;
                var roomName = `${id}`;
                if (id.startsWith('!')) roomName = getRoomNameOrId(initMatrix.matrixClient!, id);
                else if (id.startsWith('#')) {
                    const roomId = getCanonicalAliasRoomId(initMatrix.matrixClient!, id);
                    if (roomId) roomName = getRoomNameOrId(initMatrix.matrixClient!, roomId);
                }
                table[oid] = `<a href="https://matrix.to/#/${id}">#${roomName}</a>`;
                return oid;
            })
            .replaceAll(everyoneMentionRegexp, '@room'),
        parseInlineMD
    );
    for (const key in table) {
        str = str.replaceAll(key, table[key]);
    }
    return str;
};

export const toPlainText = (content: string, getDisplayName: any): string => {
    // и этот кал будет лежать на гитхабе
    return content.replaceAll(emojiRegexp, (match: string, shortcode: string, mxc: string) => `:${shortcode}:`)
        .replaceAll(userMentionRegexp, (match: string, mxId: string) => `${getDisplayName(mxId)}`)
        .replaceAll(roomMentionRegexp, (match: string, name: string, id: string) => `#${name}`)
        .replaceAll(everyoneMentionRegexp, '@room');
};

type Mentions = {
    user_ids: string[];
    room?: boolean;
};

export const getMentions = (content: string): Mentions => {
    const user_ids = [];
    const matchesUID = content.matchAll(userMentionRegexp);
    for (const match of matchesUID) {
        if (typeof match[1] === 'string') {
            user_ids.push(match[1]);
        }
    }
    const room = /{@room}/g.test(content);
    return {
        user_ids, room
    };
};

/**
 * Check if customHtml is equals to plainText
 * by replacing `<br/>` with `/n` in customHtml
 * and sanitizing plainText before comparison
 * because text are sanitized in customHtml
 * @param customHtml string
 * @param plain string
 * @returns boolean
 */
export const customHtmlEqualsPlainText = (customHtml: string, plain: string): boolean =>
    customHtml.replace(/<br\/>/g, '\n') === sanitizeText(plain);

export const trimCustomHtml = (customHtml: string) => customHtml.replace(/<br\/>$/g, '').trim();

export const trimCommand = (cmdName: string, str: string) => {
    const cmdRegX = new RegExp(`^(\\s+)?(\\/${cmdName})([^\\S\n]+)?`);

    const match = str.match(cmdRegX);
    if (!match) return str;
    return str.slice(match[0].length);
};
