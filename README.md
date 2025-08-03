# 📜 Bitcoin History Visualizer

An interactive and detailed visualization that chronicles the epic journey of Bitcoin's price, highlighting the key events that have shaped its history. This project uses D3.js to bring data to life and offer a rich and informative user experience.

**[➡️ View Live Demo](https://bitcoin-history-visualizer.vercel.app/)**

![Bitcoin History Project Screenshot](https://raw.githubusercontent.com/Mendiak/bitcoin.history/main/public/screenshot.png)

---

## ✨ Main Features

*   **📈 Interactive Chart:** A price chart rendered with D3.js spanning from 2010 to the present day.
*   **🔍 Zoom and Context:** Use the bottom chart (brush) to zoom into specific time periods and analyze the details.
*   **⚖️ Dual Scale:** Switch between **logarithmic** scale (to see percentage growth) and **linear** scale (to see absolute value).
*   **📍 Key Events:** Colored markers on the chart that indicate historical events. Hovering over them shows a quick tooltip, and clicking opens a modal with a full description and relevant links.
*   **🗂️ Event Filtering:** Filter events by category (Technology, Market, Adoption, Regulation, Security, and Halvings) to focus on what interests you most.
*   **⏳ Synchronized Timeline:** An event timeline that updates and highlights the corresponding points on the chart.
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

*   **Price Data:** Sourced from [Kaggle (Bitcoin Historical Data)](https://www.kaggle.com/datasets/mczielinski/bitcoin-historical-data) and [Bitcoinity](https://data.bitcoinity.org), covering the period from 2010.
*   **Historical Events:** Event information has been compiled and curated from various news sources, articles, and historical records from the crypto ecosystem.

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
    ├── index.html          # Archivo principal de la aplicación
    ├── style.css           # Estilos personalizados
    ├── main.js             # Lógica principal con D3.js y manejo de la interfaz
    ├── bitcoin-price-history.json # Datos históricos de precios
    ├── events.json         # Datos de los eventos clave
    ├── market-cycles.json  # Datos de los ciclos de mercado (alcista/bajista)
    └── translations.json   # Textos para la internacionalización (ES/EN)
```

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Consulta el archivo `LICENSE` para más detalles.

---

Desarrollado con ❤️ por Mikel Aramendia.