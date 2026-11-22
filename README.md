# Visual Flow - Interactive JSON Visualization Tool

Visual Flow is a powerful web application that transforms complex JSON data into intuitive, interactive visualizations. It helps developers understand, analyze, and share JSON structures with ease.

---

![Visual Flow Preview](public/demos/editor-demo-poster.jpg)

---

## 🌐 Live Demo

Visit the live application at [visualflowapp.vercel.app](https://visualflowapp.vercel.app)

---

## ✨ Features

- **Interactive Visualizations**: Transform JSON into intuitive, interactive flowcharts with automatic layout.
- **Real-time Parsing**: Instant validation and error detection as you type.
- **Schema Detection**: Automatically identify and highlight data structures with color-coded nodes.
- **Node Highlighting**: Easily identify relationships between data elements with interactive highlighting.
- **Search Functionality**: Quickly find specific values or keys in complex structures.
- **Export Options**: Save visualizations as SVG, PNG, or JPEG for documentation or presentations.
- **Local Storage**: Automatically save your work with configurable auto-save functionality.
- **Share Links**: Copy a link that holds the file, the open view and the selection. The data lives in the link itself.
- **Dark Mode**: Optimized for comfortable viewing in any environment.
- **Free, with no account**: Every feature is free and nothing is uploaded; your JSON stays in your browser.
- **Monaco Editor Integration**: Professional code editing experience with syntax highlighting.

---

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project. To run it locally:

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation Steps

1.  **Clone the repository**

    ```bash
    git clone https://github.com/samizak/Visual-Flow.git
    ```

2.  **Navigate to the project directory**

    ```bash
    cd Visual-Flow
    ```

3.  **Install dependencies**

    ```bash
    npm install
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

---

## 🛠️ Technologies Used

- **Frontend**:
  - [Next.js 15.2](https://nextjs.org)
  - [React 19](https://reactjs.org)
  - [TailwindCSS 4](https://tailwindcss.com)
- **Visualization**:
  - [React Flow 12.4](https://reactflow.dev) (@xyflow/react)
  - [Dagre 1.1.4](https://github.com/dagrejs/dagre) for graph layouts
- **Code Editing**:
  - [Monaco Editor 4.7](https://microsoft.github.io/monaco-editor/)
- **3D Effects**:
  - [Three.js 0.174](https://threejs.org)
  - [React Three Fiber 9.1](https://docs.pmnd.rs/react-three-fiber)
  - [Drei 10.0](https://github.com/pmndrs/drei)
- **State Management**:
  - [Zustand 5.0](https://github.com/pmndrs/zustand)
- **UI Components**:
  - [Radix UI](https://www.radix-ui.com/) (various components)
  - [Lucide React 0.479](https://lucide.dev)
  - [Sonner 2.0](https://sonner.emilkowal.ski/) for toast notifications
  - [Vaul 1.1](https://vaul.emilkowal.ski/) for drawers
- **Image Processing**:
  - [html-to-image 1.11](https://github.com/bubkoo/html-to-image)
  - [file-saver 2.0](https://github.com/eligrey/FileSaver.js)

---

## 🧪 Testing

The project uses Jest and React Testing Library for testing:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

---

## 🔐 Environment Variables

None. The app runs entirely in the browser: there are no accounts, no database and no API keys.

---

## 📁 Project Structure

```
json-visualiser/
├── app/                # Next.js app directory
│   ├── editor/         # JSON editor and visualization
│   └── landing-page/   # Marketing landing page
├── components/         # Global UI components
│   ├── ui/             # UI components
│   └── Visualizers/    # Visualization components
├── constants/          # Application constants
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── public/             # Static assets
├── store/              # State management with Zustand
├── styles/             # CSS styles
│   ├── base/           # Base styles
│   ├── components/     # Component styles
│   └── utils/          # Utility styles
└── utils/              # Helper utilities
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute:

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
