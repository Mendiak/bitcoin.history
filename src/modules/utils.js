export const getStoredTheme = () => localStorage.getItem('theme');
export const setStoredTheme = theme => localStorage.setItem('theme', theme);

export const getPreferredTheme = () => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const setTheme = theme => {
    document.documentElement.setAttribute('data-bs-theme', theme);
};

export const initTheme = () => {
    setTheme(getPreferredTheme());
};
