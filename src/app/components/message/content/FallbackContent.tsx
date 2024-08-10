import { Box, Text, as, color, config } from 'folds';
import React from 'react';
import { getText } from '../../../../lang';
import { mdiAlert, mdiDelete, mdiLock, mdiLockAlert } from '@mdi/js';
import Icon from '@mdi/react';

const warningStyle = { color: color.Warning.Main, opacity: config.opacity.P300 };
const criticalStyle = { color: color.Critical.Main, opacity: config.opacity.P300 };

export const MessageDeletedContent = as<'div', { children?: never; reason?: string }>(
    ({ reason, ...props }, ref) => (
        <Box as="span" alignItems="Center" gap="100" style={warningStyle} {...props} ref={ref}>
            <Icon size={0.85} path={mdiDelete} />
            {reason ? (
                <i>{getText('msg.redacted.reason', reason)}</i>
            ) : (
                <i>{getText('msg.redacted')}</i>
            )}
        </Box>
    )
);

export const MessageUnsupportedContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={criticalStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiAlert} />
        <i>{getText('msg.unsupported')}</i>
    </Box>
));

export const MessageFailedContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={criticalStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiAlert} />
        <i>{getText('msg.failed.load')}</i>
    </Box>
));

export const MessageBadEncryptedContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={warningStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiLockAlert} />
        <i>{getText('msg.failed.decrypt')}</i>
    </Box>
));

export const MessageNotDecryptedContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={warningStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiLockAlert} />
        <i>{getText('msg.not_decrypted')}</i>
    </Box>
));

export const MessageBrokenContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={criticalStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiAlert} />
        <i>{getText('msg.broken')}</i>
    </Box>
));

export const MessageEmptyContent = as<'div', { children?: never }>(({ ...props }, ref) => (
    <Box as="span" alignItems="Center" gap="100" style={criticalStyle} {...props} ref={ref}>
        <Icon size={0.85} path={mdiAlert} />
        <i>{getText('msg.empty')}</i>
    </Box>
));

export const MessageEditedContent = as<'span', { children?: never }>(({ ...props }, ref) => (
    <Text as="span" size="T200" priority="300" {...props} ref={ref}>
        {getText('msg.edited')}
    </Text>
));
