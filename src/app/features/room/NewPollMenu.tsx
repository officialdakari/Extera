import { Room } from "matrix-js-sdk";
import React, { FormEventHandler, useCallback, useEffect, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, List, ListItem, ListItemIcon, ListItemText, Switch, TextField, Typography, useTheme } from "@mui/material";
import { getText } from "../../../lang";
import SettingTile from "../../molecules/setting-tile/SettingTile";
import { Box, Text } from "folds";
import { Add, Delete } from "@mui/icons-material";
import { BackButtonHandler } from "../../hooks/useBackButton";
import { AsyncStatus, useAsyncCallback } from "../../hooks/useAsyncCallback";
import { LoadingButton } from "@mui/lab";
import { v4 } from "uuid";

type NewPollMenuProps = {
    room: Room;
    open: boolean;
    onClose: () => void;
};
export default function NewPollMenu({ room, open, onClose }: NewPollMenuProps) {
    const mx = useMatrixClient();
    const theme = useTheme();
    const [disclosed, setDisclosed] = useState(false);
    const [maxAnswers, setMaxAnswers] = useState(1);
    const [answers, setAnswers] = useState<string[]>([]);
    const [question, setQuestion] = useState<string>('');

    const removeAnswer = useCallback((i: number) => {
        setAnswers((answers) => {
            const newAnswers = [...answers];
            newAnswers.splice(i, 1);
            return [...newAnswers];
        });
    }, [setAnswers]);

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const { answerInput } = evt.target as HTMLFormElement & {
            searchInput: HTMLInputElement;
        };
        const v = `${answerInput.value}`;
        setAnswers((answers) => {
            return [...answers, v];
        });
        answerInput.value = '';
    };

    const [createState, create] = useAsyncCallback(
        useCallback(async () => {
            const ans = answers.map(x => ({
                id: v4(),
                'org.matrix.msc1767.text': x,
                'm.text': x
            }));
            await mx.sendEvent(
                room.roomId,
                'org.matrix.msc3381.poll.start',
                //@ts-ignore
                {
                    "org.matrix.msc3381.poll.start": {
                        answers: ans,
                        max_selections: maxAnswers,
                        kind: disclosed ? 'org.matrix.msc3381.disclosed' : 'org.matrix.msc3381.undisclosed',
                        question: {
                            "m.text": question,
                            "org.matrix.msc1767.text": question
                        }
                    }
                }
            );
            onClose();
        }, [mx, room, maxAnswers, answers, disclosed])
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            {open && <BackButtonHandler id='new-poll-menu' callback={onClose} />}
            <DialogTitle>
                {getText('new_poll.title')}
            </DialogTitle>
            <DialogContent>
                <TextField
                    size='small'
                    fullWidth
                    placeholder={getText('new_poll.question')}
                    value={question}
                    onChange={(evt) => setQuestion(evt.target.value)}
                />
                <List>
                    {answers.map((x, i) => (
                        <ListItem
                            secondaryAction={
                                <IconButton
                                    color='error'
                                    onClick={() => removeAnswer(i)}
                                    edge='end'
                                >
                                    <Delete />
                                </IconButton>
                            }
                        >
                            <ListItemText>
                                {x}
                            </ListItemText>
                        </ListItem>
                    ))}
                </List>
                <Box as='form' onSubmit={handleSubmit} style={{ marginBottom: theme.spacing(3), gap: theme.spacing(1) }}>
                    <TextField
                        sx={{ flexGrow: 1 }}
                        name='answerInput'
                        size='small'
                        label={getText('new_poll.add.label')}
                        autoComplete='off'
                    />
                    <Button
                        size='small'
                        variant='contained'
                        startIcon={<Add />}
                        type='submit'
                    >
                        {getText('btn.new_poll.add')}
                    </Button>
                </Box>
                <TextField
                    size='small'
                    fullWidth
                    type='number'
                    label={getText('new_poll.max_answers')}
                    value={maxAnswers}
                    onChange={(evt) => setMaxAnswers(parseInt(evt.target.value))}
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={disclosed}
                            onClick={() => setDisclosed(!disclosed)}
                        />
                    }
                    label={getText('new_poll.disclose.title')}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    {getText('btn.cancel')}
                </Button>
                <LoadingButton
                    onClick={create}
                    disabled={maxAnswers < 1 || maxAnswers > answers.length || answers.length === 0 || question.trim().length === 0}
                    loading={createState.status === AsyncStatus.Loading}
                >
                    {getText('btn.new_poll.create')}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}