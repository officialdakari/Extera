import { sanitizeText } from '../../utils/sanitize';
import { BlockType } from './types';
import { CustomElement } from './slate';
import { parseBlockMD, parseInlineMD } from '../../plugins/markdown';
import { findAndReplace } from '../../utils/findAndReplace';
import { Delta, Op } from 'quill/core';
import { Marked } from 'marked';

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

export const markdownToHTML = (
    content: string
): string => {
    const converter = new Marked(
        {
            breaks: true
        }
    );
    // doesnt support underline and extension system is buggy
    const result = converter.parseInline(
        content
        .replaceAll(/__(.*?)__(?!_)/g, (m: string, g: string) => `<u>${g}</u>`)
        .replaceAll(/\|\|(.*?)\|\|(?!\|)/g, (m: string, g: string) => `<span data-mx-spoiler>${g}</data>`), 
        { async: false }
    ) as string;
    console.log(content, result);
    return result;
};

export const emojiRegexp = /{:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):}/g;
export const userMentionRegexp = /{(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})}/gi;
export const roomMentionRegexp = /{([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,})}/gi;
export const anyTagRegexp = /{(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))}/gi;
export const deleteEndRegexp = /{(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))([^}]|$)/gi;
export const deleteStartRegexp = /(^|[^{])(:([a-zA-Z0-9\-_\.]+):(mxc:\/\/[a-z0-9\.\-]+\.[a-z]{2,}\/[a-zA-Z0-9_\-]+):|(@[a-zA-Z0-9\._=\-]+:[a-z0-9\.\-]+\.[a-z]{2,})|([^\|]+)\|([#!][A-Za-z0-9\._%#\+\-]+:[a-z0-9\.\-]+\.[a-z]{2,}))}/gi;

export const toMatrixCustomHTML = (
    content: string,
    getDisplayName: any
): string => {
    return markdownToHTML(content.replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;'))
        .replaceAll(emojiRegexp, (match: string, shortcode: string, mxc: string) => `<img data-mx-emoticon height="32" src="${mxc}" alt=":${shortcode}:" title=":${shortcode}:">`)
        .replaceAll(userMentionRegexp, (match: string, mxId: string) => `<a href="https://matrix.to/#/${mxId}">@${getDisplayName(mxId)}</a>`)
        .replaceAll(roomMentionRegexp, (match: string, name: string, id: string) => `<a href="https://matrix.to/#/${id}">#${name}</a>`);
};

export const toPlainText = (content: string, getDisplayName: any): string => {
    // и этот кал будет лежать на гитхабе
    return content.replaceAll(emojiRegexp, (match: string, shortcode: string, mxc: string) => `:${shortcode}:`)
        .replaceAll(userMentionRegexp, (match: string, mxId: string) => `@${getDisplayName(mxId)}`)
        .replaceAll(roomMentionRegexp, (match: string, name: string, id: string) => `#${name}`);
};

type Mentions = {
    user_ids: string[];
    room: boolean;
};

export const getMentions = (content: string): Mentions => {
    const user_ids = [];
    const matchesUID = content.matchAll(userMentionRegexp);
    for (const match of matchesUID) {
        if (typeof match[1] === 'string') {
            user_ids.push(match[1]);
        }
    }
    const room = /\b@room\b/g.test(content);
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
