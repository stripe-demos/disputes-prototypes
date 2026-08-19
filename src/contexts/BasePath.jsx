import { createContext, useContext } from 'react';

export const BasePathContext = createContext('');
export const useBasePath = () => useContext(BasePathContext);
