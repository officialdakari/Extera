/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
import parse from 'html-dom-parser';
import { sanitizeCustomHtml } from '../../utils/sanitize';

export const domToEditorInput = (node: any, parent?: any, index?: number) => {
    let final = '';
    if (node.type === 'text') {
        final += node.data;
    } else if (node.type === 'tag' && node.name === 'br') {
        final += '\n';
    } else if (node.type === 'tag') {
        if (node.name === 'i' || node.name === 'em') {
            final += `*${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}*`;
        } else if (node.name === 'b' || node.name === 'strong') {
            final += `**${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}**`;
        } else if (node.name === 'code') {
            final += `\`${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}\``;
        } else if (node.name === 'span' && 'data-mx-spoiler' in node.attribs) {
            final += `||${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}||`;
        } else if (node.name === 'blockquote') {
            final += `${node.children.map((x: any, i: number) => `> ${domToEditorInput(x, node, i).trim().split('\n').join('\n> ')}`).join('\n')}`;
        } else if (node.name === 'pre') {
            final += `\`\`${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}\`\``;
        } else if (node.name === 'del') {
            final += `~~${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}~~`;
        } else if (node.name === 'u') {
            final += `__${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}__`;
        } else if (node.name === 'img' && typeof node.attribs['data-mx-emoticon'] !== 'undefined') {
            final += `{${node.attribs.alt}${node.attribs.src}:}`;
        } else if (/^h[1-6]$/.test(node.name)) {
            final += `${'#'.repeat(parseInt(node.name.slice(1), 10))} ${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}\n`;
        } else if (node.name === 'a' && typeof node.attribs.href === 'string' && node.attribs.href.startsWith('https://matrix.to/#/')) {
            const id = node.attribs.href.slice('https://matrix.to/#/'.length);
            let text = '';
            if (node.children[0] && node.children[0].type === 'text') text = node.children[0].data;
            if (id.startsWith('@')) {
                final += `{${id}}`;
            } else {
                final += `{${text}|${id}}`;
            }
        } else if (node.name === 'ol') {
            final += `${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('\n')}`;
        } else if (node.name === 'li') {
            final += `${parent?.name === 'ol' ? `${(index ?? 0) + 1}.` : '- '} ${node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('')}`;
        } else if (node.name === 'p') {
            final += node.children.map((x: any, i: number) => domToEditorInput(x, node, i)).join('');
        }
    }
    return final;
};

export const htmlToEditorInput = (unsafeHtml: string): string => {
    const sanitizedHtml = sanitizeCustomHtml(unsafeHtml);
    let final = '';

    const domNodes = parse(sanitizedHtml);
    for (const node of domNodes) {
        final += domToEditorInput(node);
    }
    return final;
};

export const plainToEditorInput = (text: string): string => text;
