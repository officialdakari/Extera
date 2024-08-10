import { Box, MenuItem, Text, as, color, config } from 'folds';
import React, { useState, useEffect, useCallback } from 'react';
import * as css from './style.css';
import ProgressBar from '../../progressbar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { MatrixClient, MatrixEvent } from 'matrix-js-sdk';

type PollAnswerProps = {
    id: string,
    text: string,
    roomId?: string,
    eventId?: string,
    votes?: number,
    updatePoll?: () => void,
    disabled?: boolean,
    disclose?: boolean
};

function vote({ id, text, roomId, eventId }: PollAnswerProps, mx: MatrixClient, updatePoll: () => void) {
    if (!roomId || !eventId) return;
    mx.sendEvent(roomId, 'org.matrix.msc3381.poll.response', {
        body: id,
        'm.relates_to': {
            rel_type: 'm.reference',
            event_id: eventId
        },
        'org.matrix.msc3381.poll.response': {
            answers: [
                id
            ]
        }
    }).then(updatePoll);
}

export const PollAnswer = as<'div', PollAnswerProps>(
    (
        { id, text, roomId, eventId, votes, updatePoll, disabled, disclose },
        ref
    ) => {
        const mx = useMatrixClient();

        useEffect(() => {
            if (updatePoll) updatePoll();
        }, [updatePoll]);

        return <MenuItem
            radii="300"
            size='400'
            onClick={() => vote({ id, text, roomId, eventId }, mx, updatePoll ?? (() => null))}
            disabled={disabled}
        >
            <Text
                className={css.PollAnswerItemText}
                as="span"
            >
                {text}
            </Text>
            {
                disclose ? (
                    <Text
                        className={css.PollAnswerItemVoted}
                        as="span"
                    >
                        {votes}
                    </Text>
                ) : (
                    <></>
                )
            }
        </MenuItem>;
    }
);

type PollContentProps = {
    content: Record<string, any>,
    event: MatrixEvent
};

export const PollContent = as<'div', PollContentProps>((
    { content, event },
    ref
) => {
    const mx = useMatrixClient();
    const [answers, setAnswers] = useState(content['org.matrix.msc3381.poll.start'].answers);
    const [thisUserVoted, setThisUserVoted] = useState(['']);
    const [closed, setClosed] = useState(0);

    const updateVotes = useCallback(() => {
        const roomId = event.getRoomId();
        const eventId = event.getId();
        const userId = mx.getUserId();
        if (event && roomId && eventId && userId) {
            mx.relations(roomId, eventId, 'm.reference', 'org.matrix.msc3381.poll.end').then(({ events: closeEvents }) => {
                const ev = closeEvents.find(x => x.sender?.userId == event.sender?.userId);
                if (ev) {
                    setClosed(ev.localTimestamp);
                }
            });
            mx.relations(roomId, eventId, 'm.reference', 'org.matrix.msc3381.poll.response').then(({ events }) => {
                const votes: Record<string, string[]> = {};
                for (const ev of events.sort((a, b) => a.localTimestamp - b.localTimestamp).filter(x => closed == 0 || x.localTimestamp < closed)) {
                    const c = ev.getContent();
                    if (typeof c['org.matrix.msc3381.poll.response'] === 'object' && typeof c['org.matrix.msc3381.poll.response'].answers === 'object') {
                        if (ev.sender) {
                            votes[ev.sender.userId] = c['org.matrix.msc3381.poll.response'].answers;
                        }
                    }
                }
                setAnswers(content['org.matrix.msc3381.poll.start'].answers.map((answer: { id: string, 'org.matrix.msc1767.text': string }) => {
                    const v = Object.values(votes).filter(a => a.includes(answer.id)).length;
                    return { ...answer, votes: v };
                }));
                setThisUserVoted(votes[userId] ?? []);
            });
        }
    }, [content, event, mx]);

    useEffect(() => {
        updateVotes();
    }, [updateVotes]);

    return <Box as="span" direction='Column' alignItems="Start" gap="100" ref={ref}>
        <b>Poll: {content['org.matrix.msc3381.poll.start'].question['org.matrix.msc1767.text']}</b>
        <Box direction="Column" gap="100" className={css.PollAnswers}>
            {answers.map(
                (answer: { id: string, 'org.matrix.msc1767.text': string, votes: number }) => (
                    <PollAnswer disclose={closed != 0 || content['org.matrix.msc3381.poll.start'].kind == 'org.matrix.msc3381.disclosed'} disabled={closed != 0 || thisUserVoted.includes(answer.id)} key={answer.id} id={answer.id} text={answer['org.matrix.msc1767.text']} updatePoll={updateVotes} votes={answer.votes} roomId={event.getRoomId()} eventId={event.getId()} />
                )
            )}
        </Box>
    </Box>;
});
