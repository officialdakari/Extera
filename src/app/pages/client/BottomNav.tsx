import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DIRECT_PATH, HOME_PATH } from "../paths";
import { getText } from "../../../lang";
import { Home, Person } from "@mui/icons-material";

type BottomNavProps = {
    current?: 'dm' | 'rooms';
};

export default function BottomNav({ current }: BottomNavProps) {
    const nav = useNavigate();
    const onNav = (evt: any, v: string) => {
        if (v === 'dm') {
            nav(DIRECT_PATH, {
                replace: true
            });
        } else if (v === 'rooms') {
            nav(HOME_PATH, {
                replace: true
            });
        }
    };

    return (
        <BottomNavigation
            value={current}
            onChange={onNav}
        >
            <BottomNavigationAction
                label={getText('home.rooms')}
                value='rooms'
                icon={<Home />}
            />
            <BottomNavigationAction
                label={getText('nav.dm')}
                value='dm'
                icon={<Person />}
            />
        </BottomNavigation>
    );
}