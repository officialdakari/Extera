import { Box, as, color, config } from 'folds';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as css from './style.css';
import ProgressBar from '../../progressbar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { MatrixClient, MatrixError, MatrixEvent, Relations, RelationType, retryNetworkOperation, Room } from 'matrix-js-sdk';
import { Alert, Button, Checkbox, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useRelations } from '../../../hooks/useRelations';
import { getPollResponses } from '../../../utils/room';
import { Cancel, Poll } from '@mui/icons-material';
import { getText } from '../../../../lang';
import { LoadingButton } from '@mui/lab';

type PollAnswerProps = {
    id: string,
    text: string,
    roomId?: string,
    eventId?: string,
    votes?: number,
    updatePoll?: () => void,
    disabled?: boolean,
    disclose?: boolean
    voted?: boolean;
    setVote: (value: boolean) => void;
};

function vote({ id, text, roomId, eventId }: PollAnswerProps, mx: MatrixClient, updatePoll: () => void) {
    if (!roomId || !eventId) return;
    //@ts-ignore
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
        { id, text, roomId, eventId, votes, updatePoll, disabled, disclose, voted, setVote },
        ref
    ) => {
        const handleClick = () => {
            setVote?.(!voted);
        };
        return (
            <ListItemButton disabled={disabled} selected={voted} onClick={handleClick}>
                <ListItemText>
                    <Box gap='200'>
                        {disclose && <Typography fontWeight='bold' variant='button'>{votes}</Typography>}
                        <Typography>
                            {text}
                        </Typography>
                    </Box>
                </ListItemText>
            </ListItemButton>
        );
    }
);

type PollAnswersProps = {
    relations: Relations | undefined;
    room: Room;
    event: MatrixEvent;
};
const PollAnswers = ({ relations, room, event }: PollAnswersProps) => {
    const mx = useMatrixClient();
    const [voteMode, setVoteMode] = useState(false);
    const [voteAnswers, setVoteAnswers] = useState<string[]>([]);
    const content = event.getContent();
    const { answers } = content['org.matrix.msc3381.poll.start'];

    const [unvoteState, unvote] = useAsyncCallback(
        useCallback(
            async (responses: MatrixEvent[]) => {
                for (const r of responses) {
                    const evId = r.getId();
                    if (evId)
                        await mx.redactEvent(room.roomId, evId);
                }
            },
            [mx, room, event, relations]
        )
    );

    const [voteState, vote] = useAsyncCallback(
        useCallback(
            async () => {
                //@ts-ignore
                await mx.sendEvent(room.roomId, 'org.matrix.msc3381.poll.response', {
                    body: 'Poll response',
                    'm.relates_to': {
                        event_id: event.getId(),
                        rel_type: RelationType.Reference
                    },
                    'org.matrix.msc3381.poll.response': {
                        answers: voteAnswers
                    }
                });
                setVoteAnswers([]);
                setVoteMode(false);
            },
            [mx, room, event]
        )
    );

    const renderOptions = (responses: MatrixEvent[]) => {
        const myResponses = responses.filter((x: MatrixEvent) => x.sender?.userId === mx.getUserId());
        return (
            <>
                {answers.map(
                    (answer: { id: string, 'org.matrix.msc1767.text': string }) => {
                        const myResponse = myResponses.find((ev) => {
                            const c = ev.getContent();
                            const { answers } = c['org.matrix.msc3381.poll.response'];
                            return answers.includes(answer.id);
                        });
                        return (
                            <PollAnswer
                                id={answer.id}
                                text={answer['org.matrix.msc1767.text']}
                                disclose={content['org.matrix.msc3381.poll.start'].kind === 'org.matrix.msc3381.poll.disclosed'}
                                voted={voteMode ? (voteAnswers.includes(answer.id)) : (myResponse ? true : false)}
                                votes={responses.filter((ev) => {
                                    const c = ev.getContent();
                                    const { answers } = c['org.matrix.msc3381.poll.response'];
                                    return answers.includes(answer.id);
                                }).length}
                                setVote={(v) => {
                                    if (!voteMode) return;
                                    if (v) setVoteAnswers((ans) => [...ans, answer.id]);
                                    else setVoteAnswers((ans) => ans.filter(x => x !== answer.id));
                                }}
                                disabled={voteAnswers.length >= (content['org.matrix.msc3381.poll.start']?.max_selections || 1) && !voteAnswers.includes(answer.id)}
                            />
                        );
                    }
                )}
                <Box direction='Column' gap='200'>
                    {unvoteState.status === AsyncStatus.Error && (
                        <Alert sx={{ width: '100%' }} severity='error'>
                            {getText('err.unvote', (unvoteState.error as MatrixError).message)}
                        </Alert>
                    )}
                    {responses && myResponses.length > 0 && !voteMode && (
                        <LoadingButton
                            variant='text'
                            color='error'
                            fullWidth
                            onClick={() => unvote(myResponses)}
                            loading={unvoteState.status === AsyncStatus.Loading}
                        >
                            {getText('btn.unvote')}
                        </LoadingButton>
                    )}
                    {(!responses || myResponses.length === 0) && !voteMode && (
                        <Button
                            variant='text'
                            color='primary'
                            fullWidth
                            onClick={() => setVoteMode(true)}
                        >
                            {getText('btn.vote')}
                        </Button>
                    )}
                    {voteMode && (
                        <LoadingButton
                            variant='text'
                            color='success'
                            fullWidth
                            loading={voteState.status === AsyncStatus.Loading}
                            onClick={vote}
                        >
                            {getText('btn.vote.submit')}
                        </LoadingButton>
                    )}
                    {voteMode && (
                        <Button
                            variant='text'
                            color='secondary'
                            fullWidth
                            onClick={() => {
                                setVoteAnswers([]);
                                setVoteMode(false);
                            }}
                        >
                            {getText('btn.vote.cancel')}
                        </Button>
                    )}
                </Box>
            </>
        );
    };

    if (relations) {
        const responses = useRelations(
            relations,
            useCallback((rel) => [...(rel.getRelations() ?? [])], [])
        );
        return renderOptions(responses);
    } else {
        return renderOptions([]);
    }
};

type PollContentProps = {
    content: Record<string, any>,
    event: MatrixEvent
};

export const PollContent = as<'div', PollContentProps>((
    { content, event },
    ref
) => {
    const mx = useMatrixClient();
    const room = mx.getRoom(event.getRoomId())!;
    const eventId = event.getId()!;

    const timelineSet = useMemo(
        () => room.getLiveTimeline().getTimelineSet(),
        [mx, Room]
    );

    const pollResponses = getPollResponses(timelineSet, eventId);

    return (
        <Box as="span" direction='Column' alignItems="Start" gap="100" ref={ref}>
            <Alert icon={<Poll />} sx={{ width: '100%' }} severity='info'>
                {content['org.matrix.msc3381.poll.start'].question['org.matrix.msc1767.text']}
            </Alert>
            <List>
                <PollAnswers event={event} relations={pollResponses} room={room} />
            </List>
        </Box>
    );
});
