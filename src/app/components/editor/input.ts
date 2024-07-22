/* eslint-disable no-param-reassign */
import { Descendant, Text } from 'slate';
import parse from 'html-dom-parser';
import { ChildNode, Element, isText, isTag } from 'domhandler';

import { sanitizeCustomHtml } from '../../utils/sanitize';
import { BlockType, MarkType } from './types';
import {
    BlockQuoteElement,
    CodeBlockElement,
    CodeLineElement,
    EmoticonElement,
    HeadingElement,
    HeadingLevel,
    InlineElement,
    MentionElement,
    OrderedListElement,
    ParagraphElement,
    UnorderedListElement,
} from './slate';
import { parseMatrixToUrl } from '../../utils/matrix';

const markNodeToType: Record<string, MarkType> = {
    b: MarkType.Bold,
    strong: MarkType.Bold,
    i: MarkType.Italic,
    em: MarkType.Italic,
    u: MarkType.Underline,
    s: MarkType.StrikeThrough,
    del: MarkType.StrikeThrough,
    code: MarkType.Code,
    span: MarkType.Spoiler,
};

const elementToTextMark = (node: Element): MarkType | undefined => {
    const markType = markNodeToType[node.name];
    if (!markType) return undefined;

    if (markType === MarkType.Spoiler && node.attribs['data-mx-spoiler'] === undefined) {
        return undefined;
    }
    if (
        markType === MarkType.Code &&
        node.parent &&
        'name' in node.parent &&
        node.parent.name === 'pre'
    ) {
        return undefined;
    }
    return markType;
};

const parseNodeText = (node: ChildNode): string => {
    if (isText(node)) {
        return node.data;
    }
    if (isTag(node)) {
        return node.children.map((child) => parseNodeText(child)).join('');
    }
    return '';
};

const elementToInlineNode = (node: Element): MentionElement | EmoticonElement | undefined => {
    //   if (node.name === 'img' && node.attribs['data-mx-emoticon'] !== undefined) {
    //     const { src, alt } = node.attribs;
    //     if (!src) return undefined;
    //     return createEmoticonElement(src, alt || 'Unknown Emoji');
    //   }
    //   if (node.name === 'a') {
    //     const { href } = node.attribs;
    //     if (typeof href !== 'string') return undefined;
    //     const [mxId] = parseMatrixToUrl(href);
    //     if (mxId) {
    //       return createMentionElement(mxId, parseNodeText(node) || mxId, false);
    //     }
    //   }
    return undefined;
};

const parseInlineNodes = (node: ChildNode): InlineElement[] => {
    return [];
};

const parseBlockquoteNode = (node: Element): BlockQuoteElement[] | ParagraphElement[] => {
    const quoteLines: Array<InlineElement[]> = [];
    let lineHolder: InlineElement[] = [];

    const appendLine = () => {
        if (lineHolder.length === 0) return;

        quoteLines.push(lineHolder);
        lineHolder = [];
    };

    node.children.forEach((child) => {
        if (isText(child)) {
            lineHolder.push({ text: child.data });
            return;
        }
        if (isTag(child)) {
            if (child.name === 'br') {
                lineHolder.push({ text: '' });
                appendLine();
                return;
            }

            if (child.name === 'p') {
                appendLine();
                quoteLines.push(child.children.flatMap((c) => parseInlineNodes(c)));
                return;
            }

            parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
        }
    });
    appendLine();

    if (node.attribs['data-md'] !== undefined) {
        return quoteLines.map((lineChildren) => ({
            type: BlockType.Paragraph,
            children: [{ text: `${node.attribs['data-md']} ` }, ...lineChildren],
        }));
    }

    return [
        {
            type: BlockType.BlockQuote,
            children: quoteLines.map((lineChildren) => ({
                type: BlockType.QuoteLine,
                children: lineChildren,
            })),
        },
    ];
};
const parseCodeBlockNode = (node: Element): CodeBlockElement[] | ParagraphElement[] => {
    const codeLines = parseNodeText(node).trim().split('\n');

    if (node.attribs['data-md'] !== undefined) {
        const pLines = codeLines.map<ParagraphElement>((lineText) => ({
            type: BlockType.Paragraph,
            children: [
                {
                    text: lineText,
                },
            ],
        }));
        const childCode = node.children[0];
        const className =
            isTag(childCode) && childCode.tagName === 'code' ? childCode.attribs.class ?? '' : '';
        const prefix = { text: `${node.attribs['data-md']}${className.replace('language-', '')}` };
        const suffix = { text: node.attribs['data-md'] };
        return [
            { type: BlockType.Paragraph, children: [prefix] },
            ...pLines,
            { type: BlockType.Paragraph, children: [suffix] },
        ];
    }

    return [
        {
            type: BlockType.CodeBlock,
            children: codeLines.map<CodeLineElement>((lineTxt) => ({
                type: BlockType.CodeLine,
                children: [
                    {
                        text: lineTxt,
                    },
                ],
            })),
        },
    ];
};
const parseListNode = (
    node: Element
): OrderedListElement[] | UnorderedListElement[] | ParagraphElement[] => {
    const listLines: Array<InlineElement[]> = [];
    let lineHolder: InlineElement[] = [];

    const appendLine = () => {
        if (lineHolder.length === 0) return;

        listLines.push(lineHolder);
        lineHolder = [];
    };

    node.children.forEach((child) => {
        if (isText(child)) {
            lineHolder.push({ text: child.data });
            return;
        }
        if (isTag(child)) {
            if (child.name === 'br') {
                lineHolder.push({ text: '' });
                appendLine();
                return;
            }

            if (child.name === 'li') {
                appendLine();
                listLines.push(child.children.flatMap((c) => parseInlineNodes(c)));
                return;
            }

            parseInlineNodes(child).forEach((inlineNode) => lineHolder.push(inlineNode));
        }
    });
    appendLine();

    if (node.attribs['data-md'] !== undefined) {
        const prefix = node.attribs['data-md'] || '-';
        const [starOrHyphen] = prefix.match(/^\*|-$/) ?? [];
        return listLines.map((lineChildren) => ({
            type: BlockType.Paragraph,
            children: [
                { text: `${starOrHyphen ? `${starOrHyphen} ` : `${prefix}. `} ` },
                ...lineChildren,
            ],
        }));
    }

    if (node.name === 'ol') {
        return [
            {
                type: BlockType.OrderedList,
                children: listLines.map((lineChildren) => ({
                    type: BlockType.ListItem,
                    children: lineChildren,
                })),
            },
        ];
    }

    return [
        {
            type: BlockType.UnorderedList,
            children: listLines.map((lineChildren) => ({
                type: BlockType.ListItem,
                children: lineChildren,
            })),
        },
    ];
};
const parseHeadingNode = (node: Element): HeadingElement | ParagraphElement => {
    const children = node.children.flatMap((child) => parseInlineNodes(child));

    const headingMatch = node.name.match(/^h([123456])$/);
    const [, g1AsLevel] = headingMatch ?? ['h3', '3'];
    const level = parseInt(g1AsLevel, 10);

    if (node.attribs['data-md'] !== undefined) {
        return {
            type: BlockType.Paragraph,
            children: [{ text: `${node.attribs['data-md']} ` }, ...children],
        };
    }

    return {
        type: BlockType.Heading,
        level: (level <= 3 ? level : 3) as HeadingLevel,
        children,
    };
};

export const domToEditorInput = (node: any) => {
    var final = '';
    if (node.type == 'text') {
        final += node.data;
    } else if (node.type == 'tag' && node.name == 'br') {
        final += '\n';
    } else if (node.type == 'tag') {
        if (node.name == 'i' || node.name == 'em') {
            final += `*${node.children.map((x: any) => domToEditorInput(x)).join('')}*`;
        } else if (node.name == 'b') {
            final += `**${node.children.map((x: any) => domToEditorInput(x)).join('')}**`;
        } else if (node.name == 'code') {
            final += `\`${node.children.map((x: any) => domToEditorInput(x)).join('')}\``;
        } else if (node.name == 'del') {
            final += `~~${node.children.map((x: any) => domToEditorInput(x)).join('')}~~`;
        } else if (node.name == 'u') {
            final += `__${node.children.map((x: any) => domToEditorInput(x)).join('')}__`;
        } else if (node.name == 'img' && node.attribs['data-mx-emoticon']) {
            final += `{${node.attribs.alt}${node.attribs.src}}`;
        } else if (node.name == 'a' && typeof node.attribs.href === 'string' && node.attribs.href.startsWith('https://matrix.to/#/')) {
            const id = node.attribs.href.slice('https://matrix.to/#/'.length);
            var text = '';
            if (node.children[0] && node.children[0].type == 'text') text = node.children[0].data;
            if (id.startsWith('@')) {
                final += `{${id}}`;
            } else {
                final += `{${text}|${id}}`;
            }
        }
    }
    return final;
};

export const htmlToEditorInput = (unsafeHtml: string): string => {
    const sanitizedHtml = sanitizeCustomHtml(unsafeHtml);
    var final = '';

    const domNodes = parse(sanitizedHtml);
    console.log(domNodes);
    for (const node of domNodes) {
        final += domToEditorInput(node);
    }
    return final;
};

export const plainToEditorInput = (text: string): string => {
    return text;
};
