import { useMemo } from 'react';
import { EmojiGroupId } from '../../plugins/emoji';
import { getText } from '../../../lang';

export type IEmojiGroupLabels = Record<EmojiGroupId, string>;

export const useEmojiGroupLabels = (): IEmojiGroupLabels =>
    useMemo(
        () => ({
            [EmojiGroupId.People]: getText('egid_people'),
            [EmojiGroupId.Nature]: getText('egid_nature'),
            [EmojiGroupId.Food]: getText('egid_food'),
            [EmojiGroupId.Activity]: getText('egid_activity'),
            [EmojiGroupId.Travel]: getText('egid_travel'),
            [EmojiGroupId.Object]: getText('egid_object'),
            [EmojiGroupId.Symbol]: getText('egid_symbols'),
            [EmojiGroupId.Flag]: getText('egid_flag'),
        }),
        []
    );
