# 📜 Bitcoin History Visualizer

An interactive and detailed visualization that chronicles the epic journey of Bitcoin's price, highlighting the key events that have shaped its history. This project uses D3.js to bring data to life and offer a rich and informative user experience.

**[➡️ View Live Demo](https://bitcoin-history.vercel.app/)**

![Bitcoin History Project Screenshot](https://github.com/Mendiak/bitcoin.history/blob/main/public/assets/images/screenshot.png?raw=true)

---

## ✨ Main Features

*   **📈 Interactive Chart:** A price chart rendered with D3.js spanning from 2008 to the present day.
*   **🔍 Zoom and Context:** Use the bottom chart (brush) to zoom into specific time periods and analyze the details.
*   **⚖️ Dual Scale:** Switch between **logarithmic** scale (to see percentage growth) and **linear** scale (to see absolute value).
*   **📍 Key Events:** Colored markers on the chart that indicate historical events. Hovering over them shows a quick tooltip, and clicking opens a modal with a full description and relevant links.
*   **🗂️ Event Filtering:** Filter events by category (Technology, Market, Adoption, Regulation, Security, and Halvings) to focus on what interests you most.
*   **⏳ Synchronized Timeline:** An event timeline that updates and highlights the corresponding points on the chart.
*   **📊 Fictitious Data Handling:** For the period before price data was available (2008-2010), a "fictitious" data line is used to correctly place the earliest events on the timeline, complete with a clear legend.
*   **🌐 Multi-language Support:** The interface is available in **Spanish** and **English**, with the ability to switch languages instantly.
*   **🎨 Light & Dark Theme:** Adapts to system preferences and includes a toggle button to switch themes.
*   **📱 Responsive Design:** Fully functional on both desktop and mobile devices, thanks to Bootstrap.

## 🛠️ Tech Stack

This project is a modern web application built with:

*   **[Vite](https://vitejs.dev/):** Next generation frontend tooling.
*   **[D3.js (v7)](https://d3js.org/):** The core library for data manipulation and visualization.
*   **[Bootstrap (v5.3)](https://getbootstrap.com/):** For the responsive layout and UI components.
*   **[Bootstrap Icons](https://icons.getbootstrap.com/):** For the user interface iconography.
*   **ES6+ Modules:** Organized code architecture for better maintainability.
*   **ESLint & Prettier:** For code quality and consistent formatting.

## 📊 Data Sources

The quality and detail of the data are fundamental to this project.

*   **Price Data:** Sourced from Kaggle (Bitcoin Historical Data) and Bitcoinity, covering the period from mid-2010.
*   **Historical Events:** A meticulously curated dataset (`events.json`) with over 30 key events. Each event includes dates, categories, descriptions in both Spanish and English, and verification links.
*   **Market Cycles:** Data defining bull and bear market periods (`market-cycles.json`), visually represented as colored areas in the chart's background.

## 🚀 Running the Project Locally

Follow these steps to set up the development environment:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mendiak/bitcoin.history.git
    cd bitcoin.history
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173/`.

4.  **Build for production:**
    ```bash
    npm run build
    ```
    The production-ready files will be generated in the `dist/` folder.

## 📂 File Structure

```
.
├── public/                 # Static assets and data
│   ├── bitcoin-price-history.json
│   ├── events.json
│   ├── market-cycles.json
│   ├── translations.json
│   └── assets/             # Images and favicon
├── src/                    # Source code
│   ├── main.js             # Entry point
│   ├── style.css           # Global styles
│   └── modules/            # JS Modules (logic, UI, chart, etc.)
├── index.html              # Main HTML file
└── vite.config.js          # Vite configuration
```

## 📄 License

This project is licensed under the ISC License. See the `LICENSE` file for details.

---

Developed with ❤️ by Mikel Aramendia.