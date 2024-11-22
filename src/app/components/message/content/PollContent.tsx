import { Box, as, color, config } from 'folds';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as css from './style.css';
import ProgressBar from '../../progressbar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { MatrixClient, MatrixError, MatrixEvent, Relations, RelationType, retryNetworkOperation, Room } from 'matrix-js-sdk';
import { Alert, Button, Checkbox, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useRelations } from '../../../hooks/useRelations';
import { getPollEnd, getPollResponses } from '../../../utils/room';
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
    responses: MatrixEvent[];
    room: Room;
    event: MatrixEvent;
    pollEnded: boolean;
};
const PollAnswers = ({ responses, room, event, pollEnded }: PollAnswersProps) => {
    const mx = useMatrixClient();
    const [voteAnswers, setVoteAnswers] = useState<string[]>([]);
    const content = event.getContent();
    const { answers } = content['org.matrix.msc3381.poll.start'];

    const getVoteCount = useCallback((id: string) => {
        return responses.filter((ev) => {
            const c = ev.getContent();
            const { answers } = c['org.matrix.msc3381.poll.response'];
            return answers.includes(id);
        }).length;
    }, [responses, room, event, mx]);

    const [unvoteState, unvote] = useAsyncCallback(
        useCallback(
            async (responses: MatrixEvent[]) => {
                for (const r of responses) {
                    const evId = r.getId();
                    if (evId)
                        await mx.redactEvent(room.roomId, evId);
                }
            },
            [mx, room, event, responses]
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
            },
            [mx, room, event, voteAnswers]
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
                                disclose={content['org.matrix.msc3381.poll.start'].kind === 'org.matrix.msc3381.poll.disclosed' || pollEnded}
                                voted={voteAnswers.includes(answer.id) || (myResponse ? true : false)}
                                votes={getVoteCount(answer.id)}
                                setVote={(v) => {
                                    if (pollEnded) return;
                                    if (responses && myResponses.length > 0) return;
                                    if (v) setVoteAnswers((ans) => [...ans, answer.id]);
                                    else setVoteAnswers((ans) => ans.filter(x => x !== answer.id));
                                }}
                                disabled={voteAnswers.length >= (content['org.matrix.msc3381.poll.start']?.max_selections || 1) && !voteAnswers.includes(answer.id)}
                            />
                        );
                    }
                )}
                {!pollEnded && (
                    <Box direction='Column' gap='200'>
                        {unvoteState.status === AsyncStatus.Error && (
                            <Alert sx={{ width: '100%' }} severity='error'>
                                {getText('err.unvote', (unvoteState.error as MatrixError).message)}
                            </Alert>
                        )}
                        {responses && myResponses.length > 0 && (
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
                        {(voteAnswers.length > 0) && (
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
                    </Box>
                )}
            </>
        );
    };

    return renderOptions(responses);
};

type PollContentProps = {
    content: Record<string, any>,
    event: MatrixEvent
};

export const PollContent = (
    { content, event }: PollContentProps
) => {
    const mx = useMatrixClient();
    const room = mx.getRoom(event.getRoomId())!;
    const eventId = event.getId()!;

    const timelineSet = useMemo(
        () => room.getLiveTimeline().getTimelineSet(),
        [mx, Room]
    );

    const relations = getPollResponses(timelineSet, eventId);
    const responses = useRelations(
        relations,
        useCallback((rel) => rel ? [...(rel.getRelations() ?? [])] : [], [])
    );

    const endRelations = getPollEnd(timelineSet, eventId);
    const ends: MatrixEvent[] = useRelations(
        endRelations,
        useCallback((rel) => rel ? [...(rel.getRelations() ?? [])] : [], [])
    );
    const pollEnded = ends.find((evt) => evt.sender?.userId === event.sender?.userId) ? true : false;

    return (
        <Paper sx={{ minWidth: '230px' }}>
            <Alert icon={<Poll />} sx={{ width: '100%', background: 'transparent' }} severity='info'>
                {content['org.matrix.msc3381.poll.start'].question['org.matrix.msc1767.text']}
            </Alert>
            <List>
                <PollAnswers event={event} responses={responses} room={room} pollEnded={pollEnded} />
            </List>
        </Paper>
    );
};
