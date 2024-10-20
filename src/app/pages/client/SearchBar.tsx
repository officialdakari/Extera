import React, { ChangeEventHandler, useRef } from 'react';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import { getText } from '../../../lang';
import { IconButton, InputBaseProps } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { SEARCH_PATH } from '../paths';

type SearchBarProps = {
    doNotNavigate?: boolean;
};

export default function SearchBar({ doNotNavigate, ...props }: InputBaseProps & SearchBarProps) {
    const navigate = useNavigate();

    return (
        <SearchContainer
            onClick={() => {
                if (!doNotNavigate) navigate(SEARCH_PATH);
            }}
            sx={{ flexGrow: 1 }}
        >
            <SearchIconWrapper>
                <SearchIcon />
            </SearchIconWrapper>
            <SearchInputBase
                placeholder={getText('search')}
                {...props}
            />
        </SearchContainer>
    );
}