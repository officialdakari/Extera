import { createContext, useContext } from "react";

const NavContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>] | null>(null);
export const NavContextProvider = NavContext.Provider;

export const useNavHidden = () => {
    const navHidden = useContext(NavContext);
    if (!navHidden) throw new Error('Not initalised yet');
    return navHidden;
}