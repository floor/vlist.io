# What AI Thinks About vlist — Interview Questions

*These questions are given to each AI model with access to the vlist repository. No additional context, no prompting, no coaching. Same questions, raw unedited answers.*

---

## Setup

Give the model access to the full vlist source code. Prefer local repo access when the platform supports it — the model can read `src/`, explore the architecture, run `git log`, and inspect tests. For platforms without file access, point to the GitHub repository.

### Prompt (local repo access)

> You have access to the vlist repository locally. Please explore the codebase — read the source in `src/`, check the git history, look at the tests, and examine `package.json`. Then answer the following questions. Be honest and specific — cite files, functions, and commit messages where relevant.

### Prompt (GitHub access only)

> Please explore the vlist repository at https://github.com/floor/vlist — read the source in `src/`, browse the git history, look at the tests, and examine `package.json`. Then answer the following questions. Be honest and specific — cite files, functions, and commit messages where relevant.

---

## Questions

### 1. First impressions

Analyse the vlist package and tell me what you think.

### 2. Architecture

How would you describe the architecture to a senior developer? What design decisions stand out?

### 3. Comparison

How does vlist compare to other virtual list libraries?

### 4. Accessibility

Review the accessibility implementation.

### 5. Development process

Check the git history and tell me what you think about the development process and the timeline.

### 6. What would you improve?

What would you change, fix, or add?

### 7. Recommendation

Would you recommend this library?

---

## Models

| Model | Platform | Access | Status |
|-------|----------|--------|--------|
| Gemini 3.1 | Antigravity | Local repo | Done (7/7) |
| Claude Opus | Claude Code | Local repo | Done (7/7) |
| GPT 5.5 | Codex | Local repo | Done (7/7) |
| Mistral Large | Le Chat | GitHub | Done (7/7) |
| DeepSeek R1 | DeepSeek | GitHub | Done (7/7) |
| Grok | xAI | GitHub | Done (7/7) |
