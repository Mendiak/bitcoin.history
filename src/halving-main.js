import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import { initTheme } from './modules/utils.js';
import { state } from './modules/state.js';
import { setTranslations, setLanguage } from './modules/i18n.js';
import { initHalvingInfographic } from './modules/halving.js';
import { initUI, renderEducationalContent } from './modules/ui.js';

async function init() {
    initTheme();

    try {
        const response = await fetch('translations.json');
        const translations = await response.json();
        setTranslations(translations);
        
        initUI(); // Initialize modals and glossary links
        renderEducationalContent(translations); // Initialize footer quote

        const savedLang = localStorage.getItem('bitcoinHistoryLang') || 'es';
        
        // Setup language switcher
        document.getElementById('lang-es').addEventListener('click', () => setLanguage('es', { onLanguageChange: () => {
            initHalvingInfographic();
            renderEducationalContent(translations);
        } }));
        document.getElementById('lang-en').addEventListener('click', () => setLanguage('en', { onLanguageChange: () => {
            initHalvingInfographic();
            renderEducationalContent(translations);
        } }));

        // Setup theme toggle
        const themeToggleButton = document.getElementById('theme-toggle');
        const updateThemeButtonIcon = (theme) => {
            themeToggleButton.innerHTML = theme === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
        };
        
        themeToggleButton.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButtonIcon(newTheme);
        });

        updateThemeButtonIcon(document.documentElement.getAttribute('data-bs-theme'));
        setLanguage(savedLang, { onLanguageChange: () => {
            initHalvingInfographic();
            renderEducationalContent(translations);
        } });

    } catch (error) {
        console.error('Error initializing halving page:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
