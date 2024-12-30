import React from 'react';
import { Box, Text, as } from 'folds';
import classNames from 'classnames';
import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import * as css from './Reaction.css';
import { getHexcodeForEmoji, getShortcodeFor } from '../../plugins/emoji';
import { getMemberDisplayName } from '../../utils/room';
import { eventWithShortcode, getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { getText } from '../../../lang';
import { Typography, useTheme } from '@mui/material';

export const Reaction = as<
    'button',
    {
        mx: MatrixClient;
        count: number;
        reaction: string;
    }
>(({ className, mx, count, reaction, ...props }, ref) => {
    const theme = useTheme();
    return (
        <Box
            as="button"
            className={classNames(css.Reaction, className)}
            alignItems="Center"
            shrink="No"
            gap="200"
            {...props}
            ref={ref}
        >
            <Text className={css.ReactionText} as="span" size="T400">
                {reaction.startsWith('mxc://') ? (
                    <img
                        className={css.ReactionImg}
                        src={mxcUrlToHttp(mx, reaction) ?? reaction}
                        alt={reaction}
                    />
                ) : (
                    <Text as="span" size="Inherit" truncate>
                        {reaction}
                    </Text>
                )}
            </Text>
            <Typography variant='button'>
                {count}
            </Typography>
        </Box>
    );
});

type ReactionTooltipMsgProps = {
    room: Room;
    reaction: string;
    events: MatrixEvent[];
};

export function ReactionTooltipMsg({ room, reaction, events }: ReactionTooltipMsgProps) {
    const shortCodeEvt = events.find(eventWithShortcode);
    const shortcode =
        shortCodeEvt?.getContent().shortcode ??
        getShortcodeFor(getHexcodeForEmoji(reaction)) ??
        reaction;
    const names = events.map(
        (ev: MatrixEvent) =>
            getMemberDisplayName(room, ev.getSender() ?? getText('generic.unknown')) ??
            getMxIdLocalPart(ev.getSender() ?? getText('generic.unknown')) ??
            getText('generic.unknown')
    );

    return (
        <>
            {names.length === 1 && <b>{names[0]}</b>}
            {names.length === 2 && (
                <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.and')}
                    </Text>
                    <b>{names[1]}</b>
                </>
            )}
            {names.length === 3 && (
                <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.delimiter')}
                    </Text>
                    <b>{names[1]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.and')}
                    </Text>
                    <b>{names[2]}</b>
                </>
            )}
            {names.length > 3 && (
                <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.delimiter')}
                    </Text>
                    <b>{names[1]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.delimiter')}
                    </Text>
                    <b>{names[2]}</b>
                    <Text as="span" size="Inherit" priority="300">
                        {getText('generic.and')}
                    </Text>
                    <b>{getText('generic.others', names.length - 3)}</b>
                </>
            )}
            <Text as="span" size="Inherit" priority="300">
                {getText('reaction.reacted_with')}
            </Text>
            :<b>{shortcode}</b>:
        </>
    );
}
