import React, { FormEventHandler, RefObject } from 'react';
import { Box, Text, Input, Spinner, Chip, config } from 'folds';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiClose, mdiMagnify } from '@mdi/js';

type SearchProps = {
    active?: boolean;
    loading?: boolean;
    searchInputRef: RefObject<HTMLInputElement>;
    onSearch: (term: string) => void;
    onReset: () => void;
};
export function SearchInput({ active, loading, searchInputRef, onSearch, onReset }: SearchProps) {
    const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const { searchInput } = evt.target as HTMLFormElement & {
            searchInput: HTMLInputElement;
        };

        const searchTerm = searchInput.value.trim() || undefined;
        if (searchTerm) {
            onSearch(searchTerm);
        }
    };

    return (
        <Box as="form" direction="Column" gap="100" onSubmit={handleSearchSubmit}>
            <span data-spacing-node />
            <Text size="L400">{getText('search_input.header')}</Text>
            <Input
                ref={searchInputRef}
                style={{ paddingRight: config.space.S300 }}
                name="searchInput"
                size="500"
                variant="Background"
                placeholder={getText('placeholder.search_input')}
                autoComplete="off"
                before={
                    active && loading ? (
                        <Spinner variant="Secondary" size="200" />
                    ) : (
                        <Icon size={1} path={mdiMagnify} />
                    )
                }
                after={
                    active ? (
                        <Chip
                            key="resetButton"
                            type="reset"
                            variant="Secondary"
                            size="400"
                            radii="Pill"
                            outlined
                            after={<Icon size={1} path={mdiClose} />}
                            onClick={onReset}
                        >
                            <Text size="B300">{getText('btn.search.clear')}</Text>
                        </Chip>
                    ) : (
                        <Chip type="submit" variant="Primary" size="400" radii="Pill" outlined>
                            <Text size="B300">{getText('search_input.clear')}</Text>
                        </Chip>
                    )
                }
            />
        </Box>
    );
}
