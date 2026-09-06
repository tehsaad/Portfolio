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

  // Lab Notes — technical deep-dives. Kept as a learning log, not a
  // credentials list: each entry documents understanding-in-progress.
  labNotes: [
    {
      category: "SYSTEMS / C++",
      statusLabel: "Learning Note",
      title: "RAII, Move Semantics &amp; The Rule of Five",
      body: "Working through how modern C++ manages dynamic heap memory deterministically without garbage collection, via Resource Acquisition Is Initialization (RAII). Implementing move constructors to transfer ownership by pointer stealing instead of deep copies.",
      code: "class Buffer {\n    size_t sz;\n    int* data;\npublic:\n    // Move constructor: steal pointer, nullify source\n    Buffer(Buffer&amp;&amp; o) noexcept \n      : sz(o.sz), data(o.data) {\n        o.data = nullptr;\n        o.sz = 0;\n    }\n};",
      takeaway: "Move semantics turn expensive O(N) heap copy operations into O(1) pointer swaps — this is the piece that made value semantics in C++ finally click for me."
    },
    {
      category: "SYSTEMS / HARDWARE",
      statusLabel: "Learning Note",
      title: "Cache Locality &amp; Memory Layout",
      body: "Learning why theoretical time complexity O(N) alone doesn't tell the whole performance story without accounting for CPU cache line behavior. Contiguous arrays trigger hardware prefetching into L1/L2 caches in a way linked structures don't.",
      code: "// Row-Major: Contiguous cache line hits\nfor (int r = 0; r < N; ++r)\n  for (int c = 0; c < N; ++c)\n    sum += matrix[r][c];",
      takeaway: "Still building intuition here — the gap between theoretical Big-O and measured performance was bigger than I expected."
    },
    {
      category: "AI / DEEP LEARNING",
      statusLabel: "Learning Note",
      title: "Reading Through Self-Attention",
      body: "Studying how Transformers replace sequential recurrence with self-attention, mapping inputs to Query (Q), Key (K), and Value (V) matrices, then scaling QK^T by 1/sqrt(d_k) before the softmax.",
      code: "# Scaled Dot-Product Attention\nscores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)\nattn_weights = torch.softmax(scores, dim=-1)\noutput = torch.matmul(attn_weights, V)",
      takeaway: "I can follow the mechanics from the paper, but I haven't implemented this from scratch yet — that's a planned lab note once I get there."
    },
    {
      category: "AI / SYSTEMS",
      statusLabel: "Learning Note",
      title: "Dense Embeddings vs. Lexical BM25 Search",
      body: "Reading about why pure vector similarity in Retrieval-Augmented Generation (RAG) can miss exact serial numbers, error codes, and entity names — and how hybrid search combines dense embeddings with sparse BM25 keyword matching.",
      code: "# Reciprocal Rank Fusion (RRF)\ndef rrf_score(rank_dense, rank_bm25, k=60):\n    return (1.0 / (k + rank_dense)) + (1.0 / (k + rank_bm25))",
      takeaway: "Noted for when the Study Companion project needs retrieval — haven't applied this in code yet."
    }
  ]
};
