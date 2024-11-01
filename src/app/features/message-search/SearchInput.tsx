import React, { FormEventHandler, RefObject } from 'react';
import { Box, Text, Input, Spinner, Chip, config } from 'folds';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiClose, mdiMagnify } from '@mdi/js';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';

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
            <SearchContainer>
                <SearchIconWrapper>
                    <SearchIcon />
                </SearchIconWrapper>
                <SearchInputBase
                    placeholder={getText('placeholder.search_input')}
                    inputRef={searchInputRef}
                    name='searchInput'
                />
            </SearchContainer>
        </Box>
    );
}
