import React from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import ReCAPTCHA from 'react-google-recaptcha';
import { StageComponentProps } from './types';
import { getText } from '../../../lang';

function ReCaptchaErrorDialog({
    title,
    message,
    onCancel,
}: {
    title: string;
    message: string;
    onCancel: () => void;
}) {
    return (
        <Dialog>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Box direction="Column" gap="100">
                    <Text size="H4">{title}</Text>
                    <Text>{message}</Text>
                </Box>
                <Button variant="Critical" fill="None" outlined onClick={onCancel}>
                    <Text as="span" size="B400">
                        {getText('btn.cancel')}
                    </Text>
                </Button>
            </Box>
        </Dialog>
    );
}

export function ReCaptchaStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
    const { info, session } = stageData;

    const publicKey = info?.public_key;

    const handleChange = (token: string | null) => {
        submitAuthDict({
            type: AuthType.Recaptcha,
            response: token,
            session,
        });
    };

    if (typeof publicKey !== 'string' || !session) {
        return (
            <ReCaptchaErrorDialog
                title={getText('recaptcha_stage.error')}
                message={getText('recaptcha_stage.error.2')}
                onCancel={onCancel}
            />
        );
    }

    return (
        <Dialog>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Text>{getText('recaptcha_stage.tip')}</Text>
                <ReCAPTCHA sitekey={publicKey} onChange={handleChange} />
            </Box>
        </Dialog>
    );
}
