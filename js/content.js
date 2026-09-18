/*
  content.js — structured data for recurring site content.

  To add a new project / journey entry / lab note: add an object to the
  matching array below. render.js turns these into the same card markup
  that used to be hand-copied on each page, using the site's existing
  CSS classes (.card, .deep-dive-card, .ledger-item, etc.) so the visual
  design never has to change here.

  status values: "planned" | "in-progress" | "complete"
*/

const SITE_DATA = {
  projects: [
    {
      category: "SYSTEMS / C++",
      status: "in-progress",
      statusLabel: "In Progress",
      lang: "C++ &middot; Memory Management",
      title: "Custom Smart Pointer Library",
      description: "A lightweight library implementing custom <code>unique_ptr</code> and <code>shared_ptr</code> RAII memory wrappers from scratch, internalizing move semantics, operator overloading, and the Rule of Five.",
      stack: ["C++17", "CMake", "GoogleTest", "RAII"],
      linkLabel: "GitHub Profile ↗",
      linkUrl: "https://github.com/tehsaad"
    },
    {
      category: "SYSTEMS / C++",
      status: "complete",
      statusLabel: "Completed",
      lang: "C++ &middot; Qt &middot; OOP Architecture",
      title: "Library Management System",
      description: "A Qt-based desktop system modeling inventory, user privileges, and loans through virtual inheritance hierarchies, with CSV-based file persistence and robust error handling. Core business logic is kept Qt-free and interacts with the GUI only through slots.",
      stack: ["C++", "Qt", "OOP", "CSV Persistence", "Inheritance"],
      linkLabel: "GitHub Repo ↗",
      linkUrl: "https://github.com/tehsaad/Library-Managment-System"
    },
    {
      category: "AI / NLP",
      status: "in-progress",
      statusLabel: "In Progress",
      lang: "Python &middot; Natural Language",
      title: "Study Companion AI Assistant",
      description: "An NLP-driven study tool that indexes syllabus documents, retrieves key course concepts, and answers academic queries using semantic parsing and lightweight embeddings.",
      stack: ["Python", "spaCy", "Flask", "Vector Search"],
      linkLabel: "GitHub Profile ↗",
      linkUrl: "https://github.com/tehsaad"
    },
    {
      category: "DATA / PYTHON",
      status: "planned",
      statusLabel: "Planned",
      lang: "Python &middot; Data Analysis",
      title: "Personal Finance &amp; Expense Engine",
      description: "CLI and analytics tool that ingests transaction data, classifies recurring spending patterns, and generates visual budget breakdowns across academic terms.",
      stack: ["Python", "Pandas", "Matplotlib", "CLI"],
      linkLabel: "GitHub Profile ↗",
      linkUrl: "https://github.com/tehsaad"
    },
    {
      category: "WEB / FRONTEND",
      status: "in-progress",
      statusLabel: "In Progress",
      lang: "JavaScript &middot; UI Architecture",
      title: "Degree Roadmap Planner",
      description: "An interactive course and semester management dashboard featuring draggable course tracks, prerequisites visualization, and localStorage state persistence.",
      stack: ["JavaScript (ES6+)", "HTML5 Drag &amp; Drop", "CSS Grid"],
      linkLabel: "GitHub Profile ↗",
      linkUrl: "https://github.com/tehsaad"
    },
    {
      category: "FULL STACK",
      status: "planned",
      statusLabel: "Planned",
      lang: "Node.js &middot; Realtime Systems",
      title: "Realtime Study Room Network",
      description: "A low-latency collaborative study room application with live chat channels, markdown note syncing, and session state via WebSockets.",
      stack: ["Node.js", "Express", "WebSockets", "Socket.io"],
      linkLabel: "GitHub Profile ↗",
      linkUrl: "https://github.com/tehsaad"
    },
    {
      category: "HTML, Canvas",
      status: "complete",
      statusLabel: "completed",
      lang: "JS and Supabase",
      title: "Snake Game, A Web-based Game without Phaser",
      description: "Snake Game, Basic Game build using HTML, CSS, JS adn Canvas. Game is simple with 4 diffrent modes. Backend Database is connected. Every User Score is stored and Displayed on Leaderboard.",
      stack: ["HTML", "CSS", "JavaScript", "Canvas"],
      linkLabel: "Snake Game ↗",
      linkUrl: "https://tehsaad.site/games/snake-game/index.html"
    }
  ],

  // Journey timeline — completed/current years vs. planned future years.
  journey: [
    {
      year: "2026",
      kind: "current",
      label: "YEAR 1 &middot; CURRENT",
      heading: "Foundations",
      entries: [
        { date: "March 2026", title: "Commenced BS Computer Science at NUST SEECS", body: "Enrolled in the School of Electrical Engineering &amp; Computer Science, committing to a 4-year curriculum spanning systems foundations and AI specialization.", status: "complete" },
        { date: "Late 2025", title: "Portfolio Architecture &amp; Semantic Dossier System", body: "Designed a static portfolio architecture with custom design tokens, accessible keyboard navigation, and responsive typography without heavy UI frameworks.", status: "complete" },
        { date: "January 2026", title: "Personal Finance &amp; Expense Analytics Engine", body: "Built a CLI and automated financial aggregation tool in Python using Pandas and Matplotlib for parsing recurring expenses and spending trends.", status: "complete" },
        { date: "In progress", title: "Study Companion NLP Assistant &amp; Vector Embeddings", body: "Building an NLP retrieval pipeline in Python and spaCy to index academic syllabi and answer semantic queries using lightweight vector representations.", status: "in-progress" },
        { date: "In progress", title: "C++ Smart Pointer Library &amp; RAII Architecture", body: "Building custom RAII wrappers with move constructors, custom deleters, and GoogleTest suites to internalize the Rule of Five and modern C++ memory models.", status: "in-progress" }
      ]
    },
    {
      year: "2027",
      kind: "planned",
      label: "YEAR 2 &middot; PLANNED DIRECTION",
      heading: "Planned Direction",
      entries: [
        { title: "Data Structures &amp; Algorithms", body: "Advanced OOP design, algorithm complexity, and core data structures coursework." },
        { title: "Python for AI &amp; Data", body: "Building fluency in NumPy, Pandas, and applied scripting ahead of the ML coursework." },
        { title: "Mathematics for Machine Learning", body: "Linear algebra, multivariable calculus, and probability foundations." },
        { title: "Machine Learning Fundamentals", body: "Supervised and unsupervised learning, model evaluation." },
        { title: "More serious software projects", body: "Larger builds combining systems and early ML work." }
      ]
    }
  ],

};
