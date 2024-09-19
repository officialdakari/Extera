import React from 'react';
import './IgnoreUserList.scss';

import initMatrix from '../../../client/initMatrix';
import * as roomActions from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import Chip from '../../atoms/chip/Chip';
import Input from '../../atoms/input/Input';
import Button from '../../atoms/button/Button';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SettingTile from '../setting-tile/SettingTile';

import { useAccountData } from '../../hooks/useAccountData';
import { mdiClose, mdiEqual, mdiEqualBox, mdiRegex } from '@mdi/js';
import { getText } from '../../../lang';
import cons from '../../../client/state/cons';

function IgnoreUserList() {
    useAccountData('m.ignored_user_list');
    const ignoredUsers = initMatrix.matrixClient.getIgnoredUsers();

    const handleSubmit = (evt) => {
        evt.preventDefault();
        const { ignoreInput } = evt.target.elements;
        const value = ignoreInput.value.trim();
        const userIds = value.split(' ').filter((v) => v.match(/^@\S+:\S+$/));
        if (userIds.length === 0) return;
        ignoreInput.value = '';
        roomActions.ignore(userIds);
    };

    return (
        <div className="ignore-user-list">
            <MenuHeader>{getText('settings_header.ignored_users')}</MenuHeader>
            <SettingTile
                title={getText('title.ignore_user')}
                content={(
                    <div className="ignore-user-list__users">
                        <Text variant="b3">{getText('ignore_user.tip')}</Text>
                        <form onSubmit={handleSubmit}>
                            <Input name="ignoreInput" required />
                            <Button variant="primary" type="submit">{getText('btn.ignore')}</Button>
                        </form>
                        {ignoredUsers.length > 0 && (
                            <div>
                                {ignoredUsers.map((uId) => (
                                    <Chip
                                        iconSrc={mdiClose}
                                        key={uId}
                                        text={uId}
                                        onClick={() => roomActions.unignore([uId])}
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

function IgnorePolicyList() {
    useAccountData(cons.IGNORE_POLICIES);
    const policies = roomActions.getIgnorePolicies();

    const handleSubmit = (evt) => {
        evt.preventDefault();
        const { ignoreInput } = evt.target.elements;
        const value = ignoreInput.value.trim();
        roomActions.addIgnorePolicy([{
            type: 'regex',
            content: value
        }]);
    };

    return (
        <div className="ignore-user-list">
            <MenuHeader>{getText('settings_header.ignore_policies')}</MenuHeader>
            <SettingTile
                title={getText('title.new_ignore_policy')}
                content={(
                    <div className="ignore-user-list__users">
                        <Text variant="b3">{getText('ignore_policies.tip')}</Text>
                        <form onSubmit={handleSubmit}>
                            <Input name="ignoreInput" required />
                            <Button variant="primary" type="submit">{getText('btn.add_ignore_policy')}</Button>
                        </form>
                        {policies.length > 0 && (
                            <div>
                                {policies.map(({ type, content }) => (
                                    <Chip
                                        iconSrc={type === 'regex' ? mdiRegex : mdiEqualBox}
                                        key={content}
                                        text={content}
                                        onClick={() => roomActions.removeIgnorePolicy([{ type, content }])}
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

export default IgnoreUserList;
export { IgnorePolicyList };