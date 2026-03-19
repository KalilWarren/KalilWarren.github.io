---
title: 'StatTeacher Toolkit: A Browser-Based Application for Generating and Practicing Psychological Statistics Problems'
tags:
  - Python
  - TypeScript
  - Statistics Education
  - Hypothesis Testing
  - Psychology
  - Pyodide
  - WebAssembly
authors:
  - name: Kalil Warren
    orcid: 0009-0009-3409-9436
    affiliation: 1
affiliations:
  - name: Department of Psychology, University of South Carolina, Columbia, SC, USA
    index: 1
date: 19 March 2026
bibliography: paper.bib
---

# Summary

StatTeacher Toolkit is a free, open-source, browser-based application designed for instructors and students in undergraduate psychological statistics courses. The toolkit enables instructors to generate customizable datasets and practice problems for nine hypothesis-testing procedures commonly taught in introductory statistics (z-tests, t-tests, ANOVA, correlation, and regression), and provides students with an interactive practice environment featuring instant grading and worked solutions. All statistical computation runs client-side via Pyodide, a WebAssembly port of CPython, meaning that no installation, server infrastructure, or data transmission is required—users simply open a URL. The Instructor Toolkit is available at [https://kalilwarren.github.io/toolkit.html](https://kalilwarren.github.io/toolkit.html) and the Student Practice module at [https://kalilwarren.github.io/student.html](https://kalilwarren.github.io/student.html). The source code is available on GitHub.

# Statement of Need

Undergraduate statistics courses in psychology programs typically require students to practice hand-computation of hypothesis tests to develop procedural fluency and conceptual understanding [@garfield2002challenge; @chance2007role]. Instructors face a recurring challenge: generating enough novel, well-constructed practice problems with complete answer keys. Existing resources—textbook problem sets, publisher test banks, and general-purpose tools such as JASP [@JASP2025] or jamovi [@jamovi2025]—either provide a fixed pool of problems that cannot be customized, or focus on data analysis rather than pedagogical problem generation. To our knowledge, no existing open-source tool allows instructors to (a) programmatically generate problems with full instructor answer keys, (b) control statistical parameters to produce problems with desired properties (e.g., a specific effect size or sample size), and (c) provide students with a self-paced practice interface that grades responses and displays worked solutions.

StatTeacher Toolkit contributes to computationally enabled teaching and learning by automating the creation of practice materials that would otherwise take instructors considerable time to produce by hand, while giving students unlimited access to novel problems with immediate feedback—a format known to support learning [@hattie2007power].

# Story of the Project
 
StatTeacher Toolkit began as a final project for a Python programming course in Fall 2025. At the time, the author was teaching Psychological Statistics as instructor of record at the University of South Carolina and found that existing practice materials were either too few in number or too rigid to adapt to different instructional emphases. The initial prototype was a command-line Python script that generated z-test and t-test problems with answer keys. On the recommendation of the course instructor, the project was deployed to GitHub Pages, which prompted a redesign as a fully browser-based application using TypeScript and Pyodide. Over the 2025–2026 academic year, the toolkit expanded to cover nine instructor-side test types and nine student-side test types, with batch generation, parameter sweeps, scenario randomization, and Excel export added in response to classroom needs.

# Functionality
 
The application is organized into two modules.
 
**Instructor Toolkit** ([toolkit.html](https://kalilwarren.github.io/toolkit.html))**.** Instructors select one of nine statistical tests, configure parameters (e.g., population mean, sample size, standard deviation, alpha level, tail direction), and generate a complete dataset with a results summary table. A student problem generator then produces either a narrative-format problem (for z-tests, t-tests, and correlation) or a table-completion problem (for ANOVA and regression), each with an instructor answer key. Narrative problems present a randomized research scenario and guide students through a five-step sequence: stating hypotheses, computing the test statistic, finding the critical value, making a significance decision, and interpreting effect size. Table-completion problems present a partially masked summary table at one of three difficulty levels. All problems and datasets export as multi-sheet Excel workbooks. A batch mode produces up to 50 problems per workbook with options for scenario randomization, effect-size cycling, difficulty cycling, and parameter sweeps.
 
**Student Practice** ([student.html](https://kalilwarren.github.io/student.html))**.** Students select from nine test types and receive randomly generated problems drawn from a bank of 50 research scenarios per test type. Each scenario uses back-calculation to guarantee the desired statistical outcome within rounding tolerance. Students enter answers in structured input fields and receive immediate field-level feedback (correct/incorrect) and access to a full worked solution. A streak counter persists across sessions to encourage sustained practice.

# Experience of Use
 
The toolkit has been used as a supplementary resource in the author's PSYC 220 sections during the 2025–2026 academic year at the University of South Carolina. Students used the Student Practice module for self-directed review outside of class, and the Instructor Toolkit was used to generate exam-preparation materials and in-class worksheets. An IRB-approved usability evaluation using the System Usability Scale [@brooke1996sus] is currently underway across multiple course sections, with empirical results planned for a separate publication.
 
# Adoption
 
Because the toolkit runs entirely in the browser with no installation or account required, adoption is straightforward: instructors share the URL with their students. The application requires no institutional IT support, no software licenses, and no configuration. Instructors who teach statistics courses using hand-computation methods—common in psychology, education, and social science programs—can use the Instructor Toolkit to generate customized problem sets aligned with their syllabus, and can direct students to the Student Practice module for independent review. The scenario banks are drawn from psychological and health research contexts, but the underlying statistical procedures are general and applicable across disciplines.

# Implementation

StatTeacher Toolkit is a fully client-side web application built with TypeScript and compiled via Vite. Statistical computation is performed by a Python engine (`Engine_v1.0.0.py`) executed in the browser through Pyodide v0.26.4, which provides access to NumPy, SciPy, and Pandas without any server-side dependencies. Communication between TypeScript and Python occurs via JSON serialization. Critical values are computed using SciPy's percent-point functions for the z, t, and F distributions. The zero-install, client-side architecture ensures accessibility for students who may lack the technical background to install statistical software and eliminates institutional IT barriers to adoption.

# Acknowledgements

The author thanks Dr. Brandon Waldon, in whose Python course this project originated and who recommended deploying it via GitHub Pages; Dr. Alex Reynolds, who encouraged pursuing publication of the toolkit; and Dr. Sara Peters and Dr. Yunhang Yin for providing early feedback on the application.

 
# AI Usage Disclosure
 
The Python statistical engine (`Engine_v1.0.0.py`) was written entirely by the author without the use of generative AI tools. For the TypeScript front-end and web interface, the author used Claude (Anthropic) to assist with code generation, refactoring, and debugging during development. Claude was also used to assist with drafting and editing this manuscript. All AI-generated code and text were thoroughly reviewed, modified, and validated by the author. All architectural decisions, statistical logic, pedagogical design, and software design choices were made by the author.

# References
