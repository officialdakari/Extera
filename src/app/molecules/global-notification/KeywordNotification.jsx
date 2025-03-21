import React from 'react';
import './KeywordNotification.scss';

import initMatrix from '../../../client/initMatrix';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SettingTile from '../setting-tile/SettingTile';

import NotificationSelector from './NotificationSelector';

import { useAccountData } from '../../hooks/useAccountData';
import {
    notifType, typeToLabel, getActionType, getTypeActions,
} from './GlobalNotification';
import { mdiChevronDown, mdiClose } from '@mdi/js';
import { Button, Chip, TextField } from '@mui/material';
import { Close, ExpandMore } from '@mui/icons-material';
import { getText } from '../../../lang';

const DISPLAY_NAME = '.m.rule.contains_display_name';
const ROOM_PING = '.m.rule.roomnotif';
const USERNAME = '.m.rule.contains_user_name';
const KEYWORD = 'keyword';

function useKeywordNotif() {
    const mx = initMatrix.matrixClient;
    const pushRules = useAccountData('m.push_rules')?.getContent();
    const override = pushRules?.global?.override ?? [];
    const content = pushRules?.global?.content ?? [];

    const rulesToType = {
        [DISPLAY_NAME]: notifType.NOISY,
        [ROOM_PING]: notifType.NOISY,
        [USERNAME]: notifType.NOISY,
    };

    const setRule = (rule, type) => {
        const evtContent = pushRules ?? {};
        if (!evtContent.global) evtContent.global = {};
        if (!evtContent.global.override) evtContent.global.override = [];
        if (!evtContent.global.content) evtContent.global.content = [];
        const or = evtContent.global.override;
        const ct = evtContent.global.content;

        if (rule === DISPLAY_NAME || rule === ROOM_PING) {
            let orRule = or.find((r) => r?.rule_id === rule);
            if (!orRule) {
                orRule = {
                    conditions: [],
                    actions: [],
                    rule_id: rule,
                    default: true,
                    enabled: true,
                };
                or.push(orRule);
            }
            if (rule === DISPLAY_NAME) {
                orRule.conditions = [{ kind: 'contains_display_name' }];
                orRule.actions = getTypeActions(type, true);
            } else {
                orRule.conditions = [
                    { kind: 'event_match', key: 'content.body', pattern: '@room' },
                    { kind: 'sender_notification_permission', key: 'room' },
                ];
                orRule.actions = getTypeActions(type, true);
            }
        } else if (rule === USERNAME) {
            let usernameRule = ct.find((r) => r?.rule_id === rule);
            if (!usernameRule) {
                const userId = mx.getUserId();
                const username = userId.match(/^@?(\S+):(\S+)$/)?.[1] ?? userId;
                usernameRule = {
                    actions: [],
                    default: true,
                    enabled: true,
                    pattern: username,
                    rule_id: rule,
                };
                ct.push(usernameRule);
            }
            usernameRule.actions = getTypeActions(type, true);
        } else {
            const keyRules = ct.filter((r) => r.rule_id !== USERNAME);
            keyRules.forEach((r) => {
                // eslint-disable-next-line no-param-reassign
                r.actions = getTypeActions(type, true);
            });
        }

        mx.setAccountData('m.push_rules', evtContent);
    };

    const addKeyword = (keyword) => {
        if (content.find((r) => r.rule_id === keyword)) return;
        content.push({
            rule_id: keyword,
            pattern: keyword,
            enabled: true,
            default: false,
            actions: getTypeActions(rulesToType[KEYWORD] ?? notifType.NOISY, true),
        });
        mx.setAccountData('m.push_rules', pushRules);
    };
    const removeKeyword = (rule) => {
        pushRules.global.content = content.filter((r) => r.rule_id !== rule.rule_id);
        mx.setAccountData('m.push_rules', pushRules);
    };

    const dsRule = override.find((rule) => rule.rule_id === DISPLAY_NAME);
    const roomRule = override.find((rule) => rule.rule_id === ROOM_PING);
    const usernameRule = content.find((rule) => rule.rule_id === USERNAME);
    const keywordRule = content.find((rule) => rule.rule_id !== USERNAME);

    if (dsRule) rulesToType[DISPLAY_NAME] = getActionType(dsRule);
    if (roomRule) rulesToType[ROOM_PING] = getActionType(roomRule);
    if (usernameRule) rulesToType[USERNAME] = getActionType(usernameRule);
    if (keywordRule) rulesToType[KEYWORD] = getActionType(keywordRule);

    return {
        rulesToType,
        pushRules,
        setRule,
        addKeyword,
        removeKeyword,
    };
}

function GlobalNotification() {
    const {
        rulesToType,
        pushRules,
        setRule,
        addKeyword,
        removeKeyword,
    } = useKeywordNotif();

    const keywordRules = pushRules?.global?.content.filter((r) => r.rule_id !== USERNAME) ?? [];

    const onSelect = (evt, rule) => {
        openReusableContextMenu(
            'bottom',
            getEventCords(evt, '.btn-surface'),
            (requestClose) => (
                <NotificationSelector
                    value={rulesToType[rule]}
                    onSelect={(value) => {
                        if (rulesToType[rule] !== value) setRule(rule, value);
                        requestClose();
                    }}
                />
            ),
        );
    };

    const handleSubmit = (evt) => {
        evt.preventDefault();
        const { keywordInput } = evt.target.elements;
        const value = keywordInput.value.trim();
        if (value === '') return;
        addKeyword(value);
        keywordInput.value = '';
    };

    return (
        <div className="keyword-notification">
            <MenuHeader>{getText('header.mentions_and_keywords')}</MenuHeader>
            <SettingTile
                title="Message containing my display name"
                options={(
                    <Button onClick={(evt) => onSelect(evt, DISPLAY_NAME)} variant='outlined' startIcon={<ExpandMore />}>
                        {typeToLabel[rulesToType[DISPLAY_NAME]]}
                    </Button>
                )}
                content={<Text variant="b3">{getText('desc.displayname')}</Text>}
            />
            <SettingTile
                title="Message containing my username"
                options={(
                    <Button onClick={(evt) => onSelect(evt, USERNAME)} variant='outlined' startIcon={<ExpandMore />}>
                        {typeToLabel[rulesToType[USERNAME]]}
                    </Button>
                )}
                content={<Text variant="b3">{getText('desc.username')}</Text>}
            />
            <SettingTile
                title="Message containing @room"
                options={(
                    <Button onClick={(evt) => onSelect(evt, ROOM_PING)} variant='outlined' startIcon={<ExpandMore />}>
                        {typeToLabel[rulesToType[ROOM_PING]]}
                    </Button>
                )}
                content={<Text variant="b3">{getText('desc.room')}</Text>}
            />
            {rulesToType[KEYWORD] && (
                <SettingTile
                    title="Message containing keywords"
                    options={(
                        <Button onClick={(evt) => onSelect(evt, KEYWORD)} variant='outlined' startIcon={<ExpandMore />}>
                            {typeToLabel[rulesToType[KEYWORD]]}
                        </Button>
                    )}
                    content={<Text variant="b3">{getText('desc.keyword')}</Text>}
                />
            )}
            <SettingTile
                title="Keywords"
                content={(
                    <div className="keyword-notification__keyword">
                        <Text variant="b3">{getText('header.keyword')}</Text>
                        <form onSubmit={handleSubmit}>
                            <TextField size='small' sx={{ flexGrow: 1 }} variant='outlined' label={getText('label.keyword_input')} name="keywordInput" required />
                            <Button size='small' variant="contained" type="submit">{getText('btn.add')}</Button>
                        </form>
                        {keywordRules.length > 0 && (
                            <div>
                                {keywordRules.map((rule) => (
                                    <Chip
                                        icon={<Close />}
                                        key={rule.rule_id}
                                        label={rule.pattern}
                                        onClick={() => removeKeyword(rule)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            />
        </div>
    );
}

export default GlobalNotification;
