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

This project is a static web application built with modern frontend technologies:

*   **HTML5**
*   **CSS3**
*   **JavaScript (ES6+)**
*   **[D3.js (v7)](https://d3js.org/):** The core library for data manipulation and visualization.
*   **[Bootstrap (v5.3)](https://getbootstrap.com/):** For the responsive layout and UI components (modals, buttons, etc.).
*   **[Bootstrap Icons](https://icons.getbootstrap.com/):** For the user interface iconography.

## 📊 Data Sources

The quality and detail of the data are fundamental to this project.

*   **Price Data:** Sourced from Kaggle (Bitcoin Historical Data) and Bitcoinity, covering the period from mid-2010. The data has been processed and cleaned for this visualization.
*   **Historical Events:** A meticulously curated dataset (`events.json`) with over 30 key events that have influenced Bitcoin's trajectory. Each event includes:
    *   A specific date and category.
    *   Titles and descriptions (for tooltips and modals) in both Spanish and English.
    *   Links to external sources (news articles, original documents, etc.) for verification and further reading.
*   **Market Cycles:** Data defining bull and bear market periods (`market-cycles.json`), visually represented as colored areas in the chart's background.

## 🚀 Running the Project Locally

Since this is a static project, you don't need a complex build process. Follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mendiak/bitcoin.history.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd bitcoin.history
    ```

3.  **Start a local server:**
    The easiest way is to use a simple web server to serve the `public` folder. If you have Node.js installed, you can use `live-server`.

    ```bash
    # Install live-server globally if you don't have it
    npm install -g live-server

    # Start the server in the public folder
    live-server public
    ```

    This will automatically open the project in your browser. If not, you can open `http://127.0.0.1:8080` manually.

    > **Note:** Using a local server is recommended over opening `index.html` directly to avoid potential CORS issues when loading the JSON files.

## 📂 File Structure

```
.
└── public/
    ├── index.html # Main application file
    ├── style.css # Custom styles
    ├── main.js # Main logic with D3.js and UI handling
    ├── bitcoin-price-history.json # Historical price data
    ├── events.json # Key event data
    ├── market-cycles.json # Market cycle data (bull/bear)
    └── translations.json # Texts for internationalization (ES/EN)
```

## 📄 License

This project is licensed under the ISC License. See the `LICENSE` file for details.


---

Developed with ❤️ by Mikel Aramendia.