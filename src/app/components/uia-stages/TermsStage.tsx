import React, { useEffect, useCallback } from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import { StageComponentProps } from './types';
import { getText } from '../../../lang';

function TermsErrorDialog({
    title,
    message,
    onRetry,
    onCancel,
}: {
    title: string;
    message: string;
    onRetry: () => void;
    onCancel: () => void;
}) {
    return (
        <Dialog>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Box direction="Column" gap="100">
                    <Text size="H4">{title}</Text>
                    <Text>{message}</Text>
                </Box>
                <Button variant="Critical" onClick={onRetry}>
                    <Text as="span" size="B400">
                        {getText('btn.retry')}
                    </Text>
                </Button>
                <Button variant="Critical" fill="None" outlined onClick={onCancel}>
                    <Text as="span" size="B400">
                        {getText('btn.cancel')}
                    </Text>
                </Button>
            </Box>
        </Dialog>
    );
}

export function AutoTermsStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
    const { errorCode, error, session } = stageData;

    const handleSubmit = useCallback(
        () =>
            submitAuthDict({
                type: AuthType.Terms,
                session,
            }),
        [session, submitAuthDict]
    );

    useEffect(() => {
        if (!errorCode) {
            handleSubmit();
        }
    }, [session, errorCode, handleSubmit]);

    if (errorCode) {
        return (
            <TermsErrorDialog
                title={errorCode}
                message={error ?? getText('error.tos')}
                onRetry={handleSubmit}
                onCancel={onCancel}
            />
        );
    }

    return null;
}
