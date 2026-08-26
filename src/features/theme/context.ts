import { createContext } from "react";
import type { ThemeContextValue } from "./theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
