import React from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import Linkify from 'linkify-react';
import { MessageEmptyContent } from './content';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import {
    LINKIFY_OPTS,
    highlightText,
    scaleSystemEmoji,
} from '../../plugins/react-custom-html-parser';
import { Box } from 'folds';

type RenderBodyProps = {
    body: string;
    customBody?: string;

    highlightRegex?: RegExp;
    htmlReactParserOptions: HTMLReactParserOptions;
};
export function RenderBody({
    body,
    customBody,
    highlightRegex,
    htmlReactParserOptions,
}: RenderBodyProps) {
    if (body === '' && !customBody) return <MessageEmptyContent />;
    if (customBody) {
        if (customBody === '') return <MessageEmptyContent />;
        return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
    }
    return (
        <Linkify options={LINKIFY_OPTS}>
            {highlightRegex
                ? highlightText(highlightRegex, scaleSystemEmoji(body))
                : scaleSystemEmoji(body)}
        </Linkify>
    );
}
