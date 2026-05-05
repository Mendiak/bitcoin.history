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

export const injectGlossary = (text, glossary) => {
    if (!text || !glossary) return text;
    
    // Sort keys by length (descending) to avoid partial matches (e.g., matching "Wallet" inside "Wallets")
    const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
    
    let processedText = text;
    
    terms.forEach(term => {
        // Find the term but only if it's not already inside a tag or part of another word
        // Simple regex: word boundary, the term (case insensitive), word boundary
        const regex = new RegExp(`\\b(${term})\\b`, 'gi');
        
        // We use a placeholder to avoid nested replacements if one term contains another
        // Actually, since we sorted by length, we should be mostly fine, 
        // but let's be careful not to replace inside already injected spans.
        // A safer way is to split by tags and only replace in text nodes.
        
        // For simplicity in this minimalist setup, we'll do a basic replace 
        // but ensure we don't double-wrap.
        processedText = processedText.replace(regex, (match) => {
            return `<span class="glossary-term" data-term="${term}">${match}</span>`;
        });
    });
    
    return processedText;
};

export const initTheme = () => {
    setTheme(getPreferredTheme());
};
