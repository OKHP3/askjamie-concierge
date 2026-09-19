# AskJamie Concierge technology inventory

Reviewed 18 September 2026 in America/Chicago (19 September UTC). The repository baseline was commit `86aa7edeef557afac0d6e7ad827779c0454aaee4`. This is a dated inventory, accompanied by the [update policy and migration plan](technology-maintenance.md).

The automated comparison contains **287 entries**: 174 npm package/version lock entries, 96 installed Python distributions, 8 GitHub Actions, 5 runtime/channel comparisons, 3 installer/package-manager entries, and 1 GitHub API version. These are not 287 independent application frameworks: the total includes transitive dependencies, platform-specific binaries, and multiple comparisons for the same runtime. **49 entries have a newer upstream candidate**, with zero unresolved lookups. Candidates are not compatibility or vulnerability findings.

## Primary application stack

| Technology | Declared requirement | Resolved/in-place version | Latest stable at review | Role |
| --- | --- | --- | --- | --- |
| TypeScript | `7.0.2` | 7.0.2 | 7.0.2 | Application, shared services, scripts and tests |
| JavaScript / ECMAScript | `ES2023`, modules `ESNext` | ES2023 compiler target; Node/browser implementations | ECMAScript 2026, 17th edition | Generated browser code and Node execution; not an npm upgrade |
| React / React DOM | `19.3.0` | 19.3.0 | 19.3.0 | Public app and private local review interface |
| Vite | `8.3.0` | 8.3.0 | 8.3.0 | Development server and both production builds |
| Vitest | `5.0.1` | 5.0.1 | 5.0.1 | Unit, component and API tests |
| Zod | `^4.3.6` | 4.6.5 | 4.6.5 | Catalog and trust evidence validation |
| yaml package | `^2.9.1` at root; `^2.8.0` in trust pipeline | 2.9.1 | 2.9.1 | Skill frontmatter and workflow parsing |
| tsx | `^4.20.0` | 4.23.13 | 4.23.13 | TypeScript script execution |
| jsdom | `^30.1.0` | 30.1.0 | 30.1.0 | DOM environment for component tests |
| Testing Library React | `^16.3.3` | 16.3.3 | 16.3.3 | Component test helpers |
| Testing Library user-event | `^14.6.7` | 14.6.7 | 14.6.7 | Simulated interaction tests |
| fflate | `^0.8.3` | 0.8.3 | 0.8.3 | Workflow artifact ZIP inspection |
| @types/react / @types/react-dom | `^19.3.0` | 19.3.0 | 19.3.0 | React type definitions |
| @types/node | `^24.0.0` | 24.13.5 | 26.6.2 overall | Keep type major aligned with supported Node 24 |
| Cisco AI Skill Scanner | `==2.1.0` | 2.1.0 | 2.1.0 | Real static security scanning through a Python environment |
| pnpm | `packageManager: pnpm@10.34.5` | 10.34.5 via Corepack; global executable 11.19.0 | 12.4.2 | Workspace and lockfile management; migration constraints in update policy |

Per-package official registry sources are linked in the complete tables below. The language standard source is [ECMA-262](https://ecma-international.org/publications-and-standards/standards/ecma-262/). Supporting implementation packages such as esbuild, Rolldown, Babel helpers, CSS parsers, and scanner SDK dependencies are listed individually below rather than treated as direct product integrations.

**Tailwind CSS and the Mermaid rendering library are not application dependencies.** The two interfaces use authored CSS and shared UI tokens. No Tailwind package/configuration or Mermaid package/diagram source is present. GitHub does have a provider-managed **Mermaid Diagram Sync Assistant** integration: its check on this review was skipped because no diagrams referenced the changed source. Its internal version is not exposed as a repository pin. There is no application database, model API call, hosted private backend, Docker image, or separately deployed Python service in this repository. Python packages such as OpenAI, Anthropic and AWS SDKs are installed through the scanner's dependency graph; their presence does not mean the public product calls those services. The configured scanner uses its static analyzer.

The six first-party workspace packages (`@askjamie/api`, `@askjamie/concierge`, `@askjamie/review-desk`, `@askjamie/catalog-schema`, `@askjamie/trust-pipeline`, `@askjamie/ui-kit`) and root manifest all declare **0.1.0**. They are private repository packages linked through `workspace:*`; external registries do not define their next version.

## Runtime, host and language boundaries

| Technology/surface | Repository or observed version | Latest stable / policy | Evidence and update boundary |
| --- | --- | --- | --- |
| Node.js | CI line 24; baseline GitHub run 24.20.0; local default 24.11.1 | Current 26.9.0; LTS / supported-line patch 24.21.0 | [Node release index](https://nodejs.org/dist/index.json); this PR tightens the minimum to 24.15 and enables latest-patch selection |
| Python | CI line 3.12; baseline GitHub run 3.12.14; local scanner environment 3.12.10 | Overall 3.14.7; 3.12 line 3.12.14 | [Python releases](https://www.python.org/downloads/); the scanner allows >=3.11,<3.15 |
| Corepack | Local 0.34.2, not repository-pinned | 0.36.0 | [npm metadata](https://registry.npmjs.org/corepack/latest); optional local installer, CI uses pnpm/action-setup |
| uv | Local 0.9.9, not repository-pinned | 0.12.17 | [PyPI metadata](https://pypi.org/pypi/uv/json); README's local Python environment installer |
| pip | Used by CI; absent from local uv-created `.venv`; exact baseline CI pip version not captured | 26.2.1 | [PyPI metadata](https://pypi.org/pypi/pip/json); do not invent a pinned version |
| npm | Local 11.6.2; not the workspace package manager | 12.0.2 | [npm metadata](https://registry.npmjs.org/npm/latest); incidental local tool |
| Git for Windows | Local 2.55.0.windows.5 | 2.55.0.windows.5 | [Official release](https://github.com/git-for-windows/git/releases/tag/v2.55.0.windows.5); machine maintenance |
| GitHub CLI | Local 2.96.0; not a production dependency | 2.101.0 | [Official releases](https://github.com/cli/cli/releases/latest); development/administration tool |
| PowerShell | Local 7.6.5; README has Windows command examples | 7.6.6 | [Official release](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.6); no product runtime dependency |
| Bash | CI explicitly uses Bash; exact installed patch not captured | Stable series 5.3 | [GNU manual](https://www.gnu.org/software/bash/manual/html_node/index.html); runner-managed interpreter |
| GitHub-hosted Ubuntu | `ubuntu-latest`; observed baseline image ubuntu-24.04 / 20260907.300.1 | Moving provider-managed image, not an application release number | [Baseline image manifest](https://github.com/actions/runner-images/blob/ubuntu24/20260907.300/images/ubuntu/Ubuntu2404-Readme.md) |
| GitHub Actions runner | Observed baseline 2.337.0 | Hosted runner managed by GitHub | Actual image/runner in job setup logs; not independently pinned here |
| GitHub REST API | Explicit header 2022-11-28 | 2026-03-10 also available | [Version endpoint](https://api.github.com/versions); coordinated API migration, not blind header replacement |
| GitHub Pages | Static hosting; public build only | Provider-managed service; no customer-selectable package version | Build manifest identifies source commit and file hashes, not a Pages software release |
| Mermaid Diagram Sync Assistant | External GitHub check observed and skipped; no library/version pin in this repository | Provider-managed GitHub App; deployed version not exposed | [Official app listing](https://github.com/marketplace/mermaid-diagram-sync); no diagrams to update in this review |
| HTML | `<!doctype html>` documents, browser DOM | WHATWG living standard | [HTML specification](https://html.spec.whatwg.org/); no numeric package pin |
| CSS | Authored styles, custom properties and responsive media queries | Modular standard; CSS Snapshot 2026 | [W3C snapshot](https://www.w3.org/TR/css/); no universal CSS version to install |
| JSON | Manifests, catalog, scan evidence, HTTP payloads | RFC 8259 / ECMA-404 | [JSON standard](https://www.rfc-editor.org/rfc/rfc8259); data format, no package pin |
| YAML | Workflow definitions, pnpm lockfile and frontmatter | YAML 1.2.2 specification | [YAML specification](https://yaml.org/spec/); parser package version is listed separately |
| Markdown | Documentation and skill files, displayed by host platforms | Renderer/flavor dependent; CommonMark 0.31.2 reference | [CommonMark](https://spec.commonmark.org/); no Markdown renderer dependency in product code |
| Browser APIs / HTTP | Fetch, DOM, Clipboard, Blob downloads, localStorage; loopback Node HTTP server | Implemented by the supported browser/runtime | No separately versioned dependency; verify browser flows after relevant updates |
| Replit | No `.replit` or `replit.nix` tracked; installed environment unverified | Unknown | Connector returned reauthentication required; local/GitHub evidence does not prove Replit parity |
| VS Code, Chrome, Edge, Explorer, ChatGPT | Operator applications mentioned in the request | Outside the repository technology stack | Their desktop versions do not establish application dependency versions |

Baseline hosted values above were read from successful Release validation run **35373661008**, associated with the baseline commit. They are distinct from this inventory's local observations. The public site cannot expose a Python or Node server version because it serves static files.

The Python transitive list below is complete for the observed environment, but not a cross-platform lock. The npm table is complete for the committed lockfile, including packages for operating systems not installed here. Exact action SHAs and dependency locations are available from the reproducible JSON audit output; SHA pins remain in the workflow/composite action files.

## Complete release lookup tables

Checked: 2026-09-19T03:20:05.383Z. Source commit: `86aa7edeef557afac0d6e7ad827779c0454aaee4` plus working changes.

A successful audit means the lookups completed, not that every dependency is current or safe. Newer versions are candidates, not compatibility approval. Python versions describe this environment; npm versions describe the lockfile, including optional platform packages.

### direct

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| @testing-library/react | 16.3.3 | 16.3.3 | current | [upstream](https://registry.npmjs.org/%40testing-library%2Freact/latest) |
| @testing-library/user-event | 14.6.7 | 14.6.7 | current | [upstream](https://registry.npmjs.org/%40testing-library%2Fuser-event/latest) |
| @types/node | 24.13.5 | 26.6.2 | update available | [upstream](https://registry.npmjs.org/%40types%2Fnode/latest) |
| @types/react-dom | 19.3.0 | 19.3.0 | current | [upstream](https://registry.npmjs.org/%40types%2Freact-dom/latest) |
| @types/react | 19.3.0 | 19.3.0 | current | [upstream](https://registry.npmjs.org/%40types%2Freact/latest) |
| fflate | 0.8.3 | 0.8.3 | current | [upstream](https://registry.npmjs.org/fflate/latest) |
| jsdom | 30.1.0 | 30.1.0 | current | [upstream](https://registry.npmjs.org/jsdom/latest) |
| react-dom | 19.3.0 | 19.3.0 | current | [upstream](https://registry.npmjs.org/react-dom/latest) |
| react | 19.3.0 | 19.3.0 | current | [upstream](https://registry.npmjs.org/react/latest) |
| tsx | 4.23.13 | 4.23.13 | current | [upstream](https://registry.npmjs.org/tsx/latest) |
| typescript | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/typescript/latest) |
| vite | 8.3.0 | 8.3.0 | current | [upstream](https://registry.npmjs.org/vite/latest) |
| vitest | 5.0.1 | 5.0.1 | current | [upstream](https://registry.npmjs.org/vitest/latest) |
| yaml | 2.9.1 | 2.9.1 | current | [upstream](https://registry.npmjs.org/yaml/latest) |
| zod | 4.6.5 | 4.6.5 | current | [upstream](https://registry.npmjs.org/zod/latest) |
| cisco-ai-skill-scanner | 2.1.0 | 2.1.0 | current | [upstream](https://pypi.org/pypi/cisco-ai-skill-scanner/json) |

### runtime

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| Node.js Current | 24.11.1 | 26.9.0 | update available | [upstream](https://nodejs.org/dist/index.json) |
| Node.js LTS | 24.11.1 | 24.21.0 | update available | [upstream](https://nodejs.org/dist/index.json) |
| Node.js supported line | 24.11.1 | 24.21.0 | update available | [upstream](https://nodejs.org/dist/index.json) |
| Python supported line | 3.12.10 | 3.12.14 | update available | [upstream](https://www.python.org/downloads/) |
| Python | 3.12.10 | 3.14.7 | update available | [upstream](https://www.python.org/downloads/) |

### toolchain

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| pnpm | 10.34.5 | 12.4.2 | update available | [upstream](https://registry.npmjs.org/pnpm/latest) |

### optional local tool

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| corepack | 0.34.2 | 0.36.0 | update available | [upstream](https://registry.npmjs.org/corepack/latest) |
| uv | 0.9.9 | 0.12.17 | update available | [upstream](https://pypi.org/pypi/uv/json) |

### service

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| GitHub REST API | 2022-11-28 | 2026-03-10 | update available | [upstream](https://api.github.com/versions) |

### action

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| actions/checkout | v6.1.0 | v7.0.1 | update available | [upstream](https://github.com/actions/checkout/releases) |
| actions/deploy-pages | v4.0.5 | v5.0.1 | update available | [upstream](https://github.com/actions/deploy-pages/releases) |
| actions/download-artifact | v4.3.0 | v8.0.1 | update available | [upstream](https://github.com/actions/download-artifact/releases) |
| actions/setup-node | v6.5.0 | v7.0.0 | update available | [upstream](https://github.com/actions/setup-node/releases) |
| actions/setup-python | v6.3.0 | v7.0.0 | update available | [upstream](https://github.com/actions/setup-python/releases) |
| actions/upload-artifact | v4.6.2 | v7.0.1 | update available | [upstream](https://github.com/actions/upload-artifact/releases) |
| actions/upload-pages-artifact | v4.0.0 | v5.0.0 | update available | [upstream](https://github.com/actions/upload-pages-artifact/releases) |
| pnpm/action-setup | v4.3.0 | v6.1.0 | update available | [upstream](https://github.com/pnpm/action-setup/releases) |

### transitive/platform

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| @asamuzakjp/css-color | 7.0.0 | 7.0.0 | current | [upstream](https://registry.npmjs.org/%40asamuzakjp%2Fcss-color/latest) |
| @asamuzakjp/dom-selector | 9.2.0 | 9.2.0 | current | [upstream](https://registry.npmjs.org/%40asamuzakjp%2Fdom-selector/latest) |
| @babel/code-frame | 7.29.7 | 8.0.6 | update available | [upstream](https://registry.npmjs.org/%40babel%2Fcode-frame/latest) |
| @babel/helper-validator-identifier | 7.29.7 | 8.0.6 | update available | [upstream](https://registry.npmjs.org/%40babel%2Fhelper-validator-identifier/latest) |
| @babel/runtime | 7.29.7 | 8.0.5 | update available | [upstream](https://registry.npmjs.org/%40babel%2Fruntime/latest) |
| @bramus/specificity | 2.4.2 | 2.4.2 | current | [upstream](https://registry.npmjs.org/%40bramus%2Fspecificity/latest) |
| @csstools/color-helpers | 6.1.1 | 6.1.1 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcolor-helpers/latest) |
| @csstools/css-calc | 3.4.0 | 3.4.0 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcss-calc/latest) |
| @csstools/css-color-parser | 4.2.3 | 4.2.3 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcss-color-parser/latest) |
| @csstools/css-parser-algorithms | 4.0.0 | 4.0.0 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcss-parser-algorithms/latest) |
| @csstools/css-syntax-patches-for-csstree | 1.1.14 | 1.1.14 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcss-syntax-patches-for-csstree/latest) |
| @csstools/css-tokenizer | 4.0.1 | 4.0.1 | current | [upstream](https://registry.npmjs.org/%40csstools%2Fcss-tokenizer/latest) |
| @esbuild/aix-ppc64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Faix-ppc64/latest) |
| @esbuild/android-arm | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fandroid-arm/latest) |
| @esbuild/android-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fandroid-arm64/latest) |
| @esbuild/android-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fandroid-x64/latest) |
| @esbuild/darwin-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fdarwin-arm64/latest) |
| @esbuild/darwin-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fdarwin-x64/latest) |
| @esbuild/freebsd-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Ffreebsd-arm64/latest) |
| @esbuild/freebsd-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Ffreebsd-x64/latest) |
| @esbuild/linux-arm | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-arm/latest) |
| @esbuild/linux-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-arm64/latest) |
| @esbuild/linux-ia32 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-ia32/latest) |
| @esbuild/linux-loong64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-loong64/latest) |
| @esbuild/linux-mips64el | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-mips64el/latest) |
| @esbuild/linux-ppc64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-ppc64/latest) |
| @esbuild/linux-riscv64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-riscv64/latest) |
| @esbuild/linux-s390x | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-s390x/latest) |
| @esbuild/linux-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Flinux-x64/latest) |
| @esbuild/netbsd-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fnetbsd-arm64/latest) |
| @esbuild/netbsd-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fnetbsd-x64/latest) |
| @esbuild/openbsd-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fopenbsd-arm64/latest) |
| @esbuild/openbsd-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fopenbsd-x64/latest) |
| @esbuild/openharmony-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fopenharmony-arm64/latest) |
| @esbuild/sunos-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fsunos-x64/latest) |
| @esbuild/win32-arm64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fwin32-arm64/latest) |
| @esbuild/win32-ia32 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fwin32-ia32/latest) |
| @esbuild/win32-x64 | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/%40esbuild%2Fwin32-x64/latest) |
| @exodus/bytes | 1.15.1 | 1.15.1 | current | [upstream](https://registry.npmjs.org/%40exodus%2Fbytes/latest) |
| @jridgewell/resolve-uri | 3.1.2 | 3.1.2 | current | [upstream](https://registry.npmjs.org/%40jridgewell%2Fresolve-uri/latest) |
| @jridgewell/sourcemap-codec | 1.6.0 | 1.6.0 | current | [upstream](https://registry.npmjs.org/%40jridgewell%2Fsourcemap-codec/latest) |
| @jridgewell/trace-mapping | 0.3.31 | 0.3.31 | current | [upstream](https://registry.npmjs.org/%40jridgewell%2Ftrace-mapping/latest) |
| @oxc-project/types | 0.150.0 | 0.150.0 | current | [upstream](https://registry.npmjs.org/%40oxc-project%2Ftypes/latest) |
| @rolldown/binding-android-arm-eabi | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-android-arm-eabi/latest) |
| @rolldown/binding-android-arm64 | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-android-arm64/latest) |
| @rolldown/binding-darwin-arm64 | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-darwin-arm64/latest) |
| @rolldown/binding-darwin-x64 | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-darwin-x64/latest) |
| @rolldown/binding-freebsd-x64 | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-freebsd-x64/latest) |
| @rolldown/binding-linux-arm-gnueabihf | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-arm-gnueabihf/latest) |
| @rolldown/binding-linux-arm64-gnu | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-arm64-gnu/latest) |
| @rolldown/binding-linux-arm64-musl | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-arm64-musl/latest) |
| @rolldown/binding-linux-ppc64-gnu | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-ppc64-gnu/latest) |
| @rolldown/binding-linux-s390x-gnu | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-s390x-gnu/latest) |
| @rolldown/binding-linux-x64-gnu | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-x64-gnu/latest) |
| @rolldown/binding-linux-x64-musl | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-linux-x64-musl/latest) |
| @rolldown/binding-openharmony-arm64 | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-openharmony-arm64/latest) |
| @rolldown/binding-win32-arm64-msvc | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-win32-arm64-msvc/latest) |
| @rolldown/binding-win32-x64-msvc | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fbinding-win32-x64-msvc/latest) |
| @rolldown/pluginutils | 1.0.1 | 1.0.1 | current | [upstream](https://registry.npmjs.org/%40rolldown%2Fpluginutils/latest) |
| @testing-library/dom | 10.4.2 | 10.4.2 | current | [upstream](https://registry.npmjs.org/%40testing-library%2Fdom/latest) |
| @types/aria-query | 5.0.4 | 5.0.4 | current | [upstream](https://registry.npmjs.org/%40types%2Faria-query/latest) |
| @types/chai | 5.2.3 | 5.2.3 | current | [upstream](https://registry.npmjs.org/%40types%2Fchai/latest) |
| @types/deep-eql | 4.0.2 | 4.0.2 | current | [upstream](https://registry.npmjs.org/%40types%2Fdeep-eql/latest) |
| @types/estree | 1.0.9 | 1.0.9 | current | [upstream](https://registry.npmjs.org/%40types%2Festree/latest) |
| @typescript/typescript-aix-ppc64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-aix-ppc64/latest) |
| @typescript/typescript-darwin-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-darwin-arm64/latest) |
| @typescript/typescript-darwin-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-darwin-x64/latest) |
| @typescript/typescript-freebsd-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-freebsd-arm64/latest) |
| @typescript/typescript-freebsd-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-freebsd-x64/latest) |
| @typescript/typescript-linux-arm | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-arm/latest) |
| @typescript/typescript-linux-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-arm64/latest) |
| @typescript/typescript-linux-loong64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-loong64/latest) |
| @typescript/typescript-linux-mips64el | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-mips64el/latest) |
| @typescript/typescript-linux-ppc64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-ppc64/latest) |
| @typescript/typescript-linux-riscv64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-riscv64/latest) |
| @typescript/typescript-linux-s390x | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-s390x/latest) |
| @typescript/typescript-linux-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-linux-x64/latest) |
| @typescript/typescript-netbsd-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-netbsd-arm64/latest) |
| @typescript/typescript-netbsd-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-netbsd-x64/latest) |
| @typescript/typescript-openbsd-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-openbsd-arm64/latest) |
| @typescript/typescript-openbsd-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-openbsd-x64/latest) |
| @typescript/typescript-sunos-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-sunos-x64/latest) |
| @typescript/typescript-win32-arm64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-win32-arm64/latest) |
| @typescript/typescript-win32-x64 | 7.0.2 | 7.0.2 | current | [upstream](https://registry.npmjs.org/%40typescript%2Ftypescript-win32-x64/latest) |
| @vitest/mocker | 5.0.1 | 5.0.1 | current | [upstream](https://registry.npmjs.org/%40vitest%2Fmocker/latest) |
| @vitest/spy | 5.0.1 | 5.0.1 | current | [upstream](https://registry.npmjs.org/%40vitest%2Fspy/latest) |
| ansi-regex | 5.0.1 | 6.3.0 | update available | [upstream](https://registry.npmjs.org/ansi-regex/latest) |
| ansi-styles | 5.2.0 | 7.0.0 | update available | [upstream](https://registry.npmjs.org/ansi-styles/latest) |
| aria-query | 5.3.0 | 5.3.2 | update available | [upstream](https://registry.npmjs.org/aria-query/latest) |
| assertion-error | 2.0.1 | 2.0.1 | current | [upstream](https://registry.npmjs.org/assertion-error/latest) |
| bidi-js | 1.1.0 | 1.1.0 | current | [upstream](https://registry.npmjs.org/bidi-js/latest) |
| chai | 6.2.2 | 6.2.2 | current | [upstream](https://registry.npmjs.org/chai/latest) |
| css-tree | 3.2.1 | 3.2.1 | current | [upstream](https://registry.npmjs.org/css-tree/latest) |
| csstype | 3.2.3 | 3.2.3 | current | [upstream](https://registry.npmjs.org/csstype/latest) |
| data-urls | 7.0.0 | 7.0.0 | current | [upstream](https://registry.npmjs.org/data-urls/latest) |
| decimal.js | 10.6.0 | 10.6.0 | current | [upstream](https://registry.npmjs.org/decimal.js/latest) |
| dequal | 2.0.3 | 2.0.3 | current | [upstream](https://registry.npmjs.org/dequal/latest) |
| detect-libc | 2.1.2 | 2.1.2 | current | [upstream](https://registry.npmjs.org/detect-libc/latest) |
| dom-accessibility-api | 0.5.16 | 0.7.1 | update available | [upstream](https://registry.npmjs.org/dom-accessibility-api/latest) |
| entities | 8.1.0 | 8.1.0 | current | [upstream](https://registry.npmjs.org/entities/latest) |
| es-module-lexer | 2.3.2 | 3.0.2 | update available | [upstream](https://registry.npmjs.org/es-module-lexer/latest) |
| esbuild | 0.28.2 | 0.28.2 | current | [upstream](https://registry.npmjs.org/esbuild/latest) |
| estree-walker | 3.0.3 | 3.0.3 | current | [upstream](https://registry.npmjs.org/estree-walker/latest) |
| expect-type | 1.4.0 | 1.4.0 | current | [upstream](https://registry.npmjs.org/expect-type/latest) |
| fdir | 6.5.0 | 6.5.0 | current | [upstream](https://registry.npmjs.org/fdir/latest) |
| fsevents | 2.3.3 | 2.3.3 | current | [upstream](https://registry.npmjs.org/fsevents/latest) |
| html-encoding-sniffer | 6.0.0 | 6.0.0 | current | [upstream](https://registry.npmjs.org/html-encoding-sniffer/latest) |
| is-potential-custom-element-name | 1.0.1 | 1.0.1 | current | [upstream](https://registry.npmjs.org/is-potential-custom-element-name/latest) |
| js-tokens | 4.0.0 | 10.0.0 | update available | [upstream](https://registry.npmjs.org/js-tokens/latest) |
| lightningcss-android-arm64 | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-android-arm64/latest) |
| lightningcss-darwin-arm64 | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-darwin-arm64/latest) |
| lightningcss-darwin-x64 | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-darwin-x64/latest) |
| lightningcss-freebsd-x64 | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-freebsd-x64/latest) |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/latest) |
| lightningcss-linux-arm64-gnu | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-linux-arm64-gnu/latest) |
| lightningcss-linux-arm64-musl | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-linux-arm64-musl/latest) |
| lightningcss-linux-x64-gnu | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-linux-x64-gnu/latest) |
| lightningcss-linux-x64-musl | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-linux-x64-musl/latest) |
| lightningcss-win32-arm64-msvc | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-win32-arm64-msvc/latest) |
| lightningcss-win32-x64-msvc | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss-win32-x64-msvc/latest) |
| lightningcss | 1.33.0 | 1.33.0 | current | [upstream](https://registry.npmjs.org/lightningcss/latest) |
| lru-cache | 11.5.2 | 11.5.3 | update available | [upstream](https://registry.npmjs.org/lru-cache/latest) |
| lz-string | 1.5.0 | 1.5.0 | current | [upstream](https://registry.npmjs.org/lz-string/latest) |
| magic-string | 1.4.1 | 1.4.1 | current | [upstream](https://registry.npmjs.org/magic-string/latest) |
| mdn-data | 2.27.1 | 2.36.0 | update available | [upstream](https://registry.npmjs.org/mdn-data/latest) |
| nanoid | 3.3.19 | 6.0.1 | update available | [upstream](https://registry.npmjs.org/nanoid/latest) |
| obug | 2.2.1 | 3.0.0 | update available | [upstream](https://registry.npmjs.org/obug/latest) |
| parse5 | 8.0.1 | 8.0.1 | current | [upstream](https://registry.npmjs.org/parse5/latest) |
| picocolors | 1.1.1 | 1.1.1 | current | [upstream](https://registry.npmjs.org/picocolors/latest) |
| picomatch | 4.0.7 | 4.0.7 | current | [upstream](https://registry.npmjs.org/picomatch/latest) |
| postcss | 8.5.28 | 8.5.28 | current | [upstream](https://registry.npmjs.org/postcss/latest) |
| pretty-format | 27.5.1 | 30.5.1 | update available | [upstream](https://registry.npmjs.org/pretty-format/latest) |
| punycode | 2.3.1 | 2.3.1 | current | [upstream](https://registry.npmjs.org/punycode/latest) |
| react-is | 17.0.2 | 19.3.0 | update available | [upstream](https://registry.npmjs.org/react-is/latest) |
| require-from-string | 2.0.2 | 2.0.2 | current | [upstream](https://registry.npmjs.org/require-from-string/latest) |
| rolldown | 1.2.9 | 1.2.9 | current | [upstream](https://registry.npmjs.org/rolldown/latest) |
| saxes | 6.0.0 | 6.0.0 | current | [upstream](https://registry.npmjs.org/saxes/latest) |
| scheduler | 0.28.0 | 0.28.0 | current | [upstream](https://registry.npmjs.org/scheduler/latest) |
| siginfo | 2.0.0 | 2.0.0 | current | [upstream](https://registry.npmjs.org/siginfo/latest) |
| source-map-js | 1.2.1 | 1.2.1 | current | [upstream](https://registry.npmjs.org/source-map-js/latest) |
| stackback | 0.0.2 | 0.0.2 | current | [upstream](https://registry.npmjs.org/stackback/latest) |
| std-env | 4.2.0 | 4.2.0 | current | [upstream](https://registry.npmjs.org/std-env/latest) |
| tinybench | 6.1.4 | 6.2.0 | update available | [upstream](https://registry.npmjs.org/tinybench/latest) |
| tinyexec | 1.3.0 | 1.3.1 | update available | [upstream](https://registry.npmjs.org/tinyexec/latest) |
| tinyglobby | 0.2.17 | 0.2.17 | current | [upstream](https://registry.npmjs.org/tinyglobby/latest) |
| tldts-core | 7.4.13 | 7.4.13 | current | [upstream](https://registry.npmjs.org/tldts-core/latest) |
| tldts | 7.4.13 | 7.4.13 | current | [upstream](https://registry.npmjs.org/tldts/latest) |
| tough-cookie | 6.0.2 | 6.0.2 | current | [upstream](https://registry.npmjs.org/tough-cookie/latest) |
| tr46 | 6.0.0 | 6.0.0 | current | [upstream](https://registry.npmjs.org/tr46/latest) |
| undici-types | 7.18.2 | 8.10.2 | update available | [upstream](https://registry.npmjs.org/undici-types/latest) |
| undici | 8.10.2 | 8.10.2 | current | [upstream](https://registry.npmjs.org/undici/latest) |
| w3c-xmlserializer | 5.0.0 | 5.0.0 | current | [upstream](https://registry.npmjs.org/w3c-xmlserializer/latest) |
| webidl-conversions | 8.0.1 | 8.0.1 | current | [upstream](https://registry.npmjs.org/webidl-conversions/latest) |
| whatwg-mimetype | 5.0.0 | 5.0.0 | current | [upstream](https://registry.npmjs.org/whatwg-mimetype/latest) |
| whatwg-url | 16.0.1 | 17.1.1 | update available | [upstream](https://registry.npmjs.org/whatwg-url/latest) |
| whatwg-url | 17.1.1 | 17.1.1 | current | [upstream](https://registry.npmjs.org/whatwg-url/latest) |
| why-is-node-running | 2.3.0 | 3.2.2 | update available | [upstream](https://registry.npmjs.org/why-is-node-running/latest) |
| xml-name-validator | 5.0.0 | 5.0.0 | current | [upstream](https://registry.npmjs.org/xml-name-validator/latest) |
| xmlchars | 2.2.0 | 2.2.0 | current | [upstream](https://registry.npmjs.org/xmlchars/latest) |

### installed transitive/tool

| Technology | In place | Latest stable | Status | Evidence |
| --- | --- | --- | --- | --- |
| aiohappyeyeballs | 2.7.1 | 2.7.1 | current | [upstream](https://pypi.org/pypi/aiohappyeyeballs/json) |
| aiohttp | 3.14.3 | 3.14.3 | current | [upstream](https://pypi.org/pypi/aiohttp/json) |
| aiosignal | 1.4.0 | 1.4.0 | current | [upstream](https://pypi.org/pypi/aiosignal/json) |
| annotated-doc | 0.0.5 | 0.0.5 | current | [upstream](https://pypi.org/pypi/annotated-doc/json) |
| annotated-types | 0.8.0 | 0.8.0 | current | [upstream](https://pypi.org/pypi/annotated-types/json) |
| anthropic | 0.125.0 | 1.7.0 | update available | [upstream](https://pypi.org/pypi/anthropic/json) |
| anyio | 4.15.1 | 4.15.1 | current | [upstream](https://pypi.org/pypi/anyio/json) |
| attrs | 26.1.0 | 26.1.0 | current | [upstream](https://pypi.org/pypi/attrs/json) |
| boto3 | 1.43.97 | 1.43.98 | update available | [upstream](https://pypi.org/pypi/boto3/json) |
| botocore | 1.43.97 | 1.43.98 | update available | [upstream](https://pypi.org/pypi/botocore/json) |
| certifi | 2026.7.22 | 2026.7.22 | current | [upstream](https://pypi.org/pypi/certifi/json) |
| cffi | 2.1.1 | 2.1.1 | current | [upstream](https://pypi.org/pypi/cffi/json) |
| charset-normalizer | 3.5.1 | 3.5.1 | current | [upstream](https://pypi.org/pypi/charset-normalizer/json) |
| click | 8.5.0 | 8.5.0 | current | [upstream](https://pypi.org/pypi/click/json) |
| colorama | 0.4.6 | 0.4.6 | current | [upstream](https://pypi.org/pypi/colorama/json) |
| colorclass | 2.2.2 | 2.2.2 | current | [upstream](https://pypi.org/pypi/colorclass/json) |
| confusable-homoglyphs | 3.3.1 | 3.3.1 | current | [upstream](https://pypi.org/pypi/confusable-homoglyphs/json) |
| cryptography | 50.0.1 | 50.0.1 | current | [upstream](https://pypi.org/pypi/cryptography/json) |
| distro | 1.9.0 | 1.9.0 | current | [upstream](https://pypi.org/pypi/distro/json) |
| docstring_parser | 0.18.0 | 0.18.0 | current | [upstream](https://pypi.org/pypi/docstring_parser/json) |
| easygui | 0.98.3 | 0.98.3 | current | [upstream](https://pypi.org/pypi/easygui/json) |
| fastapi | 0.141.1 | 0.141.1 | current | [upstream](https://pypi.org/pypi/fastapi/json) |
| fastuuid | 0.14.0 | 0.14.0 | current | [upstream](https://pypi.org/pypi/fastuuid/json) |
| filelock | 4.0.0 | 4.0.1 | update available | [upstream](https://pypi.org/pypi/filelock/json) |
| flatbuffers | 25.12.19 | 25.12.19 | current | [upstream](https://pypi.org/pypi/flatbuffers/json) |
| frozenlist | 1.8.0 | 1.8.0 | current | [upstream](https://pypi.org/pypi/frozenlist/json) |
| fsspec | 2026.7.0 | 2026.9.0 | update available | [upstream](https://pypi.org/pypi/fsspec/json) |
| h11 | 0.16.0 | 0.16.0 | current | [upstream](https://pypi.org/pypi/h11/json) |
| hf-xet | 1.6.0 | 1.6.0 | current | [upstream](https://pypi.org/pypi/hf-xet/json) |
| httpcore | 1.0.9 | 1.0.9 | current | [upstream](https://pypi.org/pypi/httpcore/json) |
| httptools | 0.8.0 | 0.8.0 | current | [upstream](https://pypi.org/pypi/httptools/json) |
| httpx | 0.28.1 | 0.28.1 | current | [upstream](https://pypi.org/pypi/httpx/json) |
| huggingface_hub | 1.32.0 | 1.32.0 | current | [upstream](https://pypi.org/pypi/huggingface_hub/json) |
| idna | 3.20 | 3.20 | current | [upstream](https://pypi.org/pypi/idna/json) |
| importlib_metadata | 8.9.0 | 9.0.1 | update available | [upstream](https://pypi.org/pypi/importlib_metadata/json) |
| Jinja2 | 3.1.6 | 3.1.6 | current | [upstream](https://pypi.org/pypi/Jinja2/json) |
| jiter | 0.17.0 | 0.17.0 | current | [upstream](https://pypi.org/pypi/jiter/json) |
| jmespath | 1.1.0 | 1.1.0 | current | [upstream](https://pypi.org/pypi/jmespath/json) |
| jsonschema-specifications | 2025.9.1 | 2025.9.1 | current | [upstream](https://pypi.org/pypi/jsonschema-specifications/json) |
| jsonschema | 4.26.0 | 4.26.0 | current | [upstream](https://pypi.org/pypi/jsonschema/json) |
| linkify-it-py | 2.2.0 | 2.2.0 | current | [upstream](https://pypi.org/pypi/linkify-it-py/json) |
| litellm | 1.101.0 | 1.101.0 | current | [upstream](https://pypi.org/pypi/litellm/json) |
| magika | 1.0.3 | 1.0.3 | current | [upstream](https://pypi.org/pypi/magika/json) |
| markdown-it-py | 4.2.0 | 4.2.0 | current | [upstream](https://pypi.org/pypi/markdown-it-py/json) |
| MarkupSafe | 3.0.3 | 3.0.3 | current | [upstream](https://pypi.org/pypi/MarkupSafe/json) |
| mdit-py-plugins | 0.6.1 | 0.6.1 | current | [upstream](https://pypi.org/pypi/mdit-py-plugins/json) |
| mdurl | 0.1.2 | 0.1.2 | current | [upstream](https://pypi.org/pypi/mdurl/json) |
| msoffcrypto-tool | 6.0.0 | 6.0.0 | current | [upstream](https://pypi.org/pypi/msoffcrypto-tool/json) |
| multidict | 6.9.0 | 6.9.0 | current | [upstream](https://pypi.org/pypi/multidict/json) |
| numpy | 2.5.3 | 2.5.3 | current | [upstream](https://pypi.org/pypi/numpy/json) |
| olefile | 0.47 | 0.47 | current | [upstream](https://pypi.org/pypi/olefile/json) |
| oletools | 0.60.2 | 0.60.2 | current | [upstream](https://pypi.org/pypi/oletools/json) |
| onnxruntime | 1.30.0 | 1.30.0 | current | [upstream](https://pypi.org/pypi/onnxruntime/json) |
| openai | 2.54.0 | 3.16.2 | update available | [upstream](https://pypi.org/pypi/openai/json) |
| packaging | 26.3 | 26.3 | current | [upstream](https://pypi.org/pypi/packaging/json) |
| pcodedmp | 1.2.6 | 1.2.6 | current | [upstream](https://pypi.org/pypi/pcodedmp/json) |
| pdfid | 1.1.3 | 1.1.3 | current | [upstream](https://pypi.org/pypi/pdfid/json) |
| platformdirs | 4.11.10 | 4.11.11 | update available | [upstream](https://pypi.org/pypi/platformdirs/json) |
| propcache | 0.5.4 | 0.5.4 | current | [upstream](https://pypi.org/pypi/propcache/json) |
| protobuf | 6.33.6 | 7.36.2 | update available | [upstream](https://pypi.org/pypi/protobuf/json) |
| pycparser | 3.0 | 3.0 | current | [upstream](https://pypi.org/pypi/pycparser/json) |
| pydantic_core | 2.46.5 | 2.49.0 | update available | [upstream](https://pypi.org/pypi/pydantic_core/json) |
| pydantic-settings | 2.15.0 | 2.15.0 | current | [upstream](https://pypi.org/pypi/pydantic-settings/json) |
| pydantic | 2.13.5 | 2.13.5 | current | [upstream](https://pypi.org/pypi/pydantic/json) |
| Pygments | 2.21.0 | 2.21.0 | current | [upstream](https://pypi.org/pypi/Pygments/json) |
| pyparsing | 3.3.2 | 3.3.2 | current | [upstream](https://pypi.org/pypi/pyparsing/json) |
| python-dateutil | 2.9.0.post0 | 2.9.0.post0 | current | [upstream](https://pypi.org/pypi/python-dateutil/json) |
| python-dotenv | 1.2.3 | 1.2.3 | current | [upstream](https://pypi.org/pypi/python-dotenv/json) |
| python-frontmatter | 1.3.0 | 1.3.0 | current | [upstream](https://pypi.org/pypi/python-frontmatter/json) |
| python-multipart | 0.0.32 | 0.0.32 | current | [upstream](https://pypi.org/pypi/python-multipart/json) |
| PyYAML | 6.0.3 | 6.0.3 | current | [upstream](https://pypi.org/pypi/PyYAML/json) |
| referencing | 0.37.0 | 0.37.0 | current | [upstream](https://pypi.org/pypi/referencing/json) |
| regex | 2026.9.10 | 2026.9.10 | current | [upstream](https://pypi.org/pypi/regex/json) |
| requests | 2.34.2 | 2.34.2 | current | [upstream](https://pypi.org/pypi/requests/json) |
| rich | 14.3.4 | 15.0.0 | update available | [upstream](https://pypi.org/pypi/rich/json) |
| rpds-py | 2026.6.3 | 2026.6.3 | current | [upstream](https://pypi.org/pypi/rpds-py/json) |
| s3transfer | 0.19.2 | 0.19.2 | current | [upstream](https://pypi.org/pypi/s3transfer/json) |
| six | 1.17.0 | 1.17.0 | current | [upstream](https://pypi.org/pypi/six/json) |
| sniffio | 1.3.1 | 1.3.1 | current | [upstream](https://pypi.org/pypi/sniffio/json) |
| starlette | 1.6.0 | 1.6.0 | current | [upstream](https://pypi.org/pypi/starlette/json) |
| tabulate | 0.10.0 | 0.10.0 | current | [upstream](https://pypi.org/pypi/tabulate/json) |
| textual | 8.2.8 | 8.2.8 | current | [upstream](https://pypi.org/pypi/textual/json) |
| tiktoken | 0.14.0 | 0.14.0 | current | [upstream](https://pypi.org/pypi/tiktoken/json) |
| tokenizers | 0.23.2 | 0.23.2 | current | [upstream](https://pypi.org/pypi/tokenizers/json) |
| tqdm | 4.70.1 | 4.70.1 | current | [upstream](https://pypi.org/pypi/tqdm/json) |
| typing_extensions | 4.16.0 | 4.16.0 | current | [upstream](https://pypi.org/pypi/typing_extensions/json) |
| typing-inspection | 0.4.4 | 0.4.4 | current | [upstream](https://pypi.org/pypi/typing-inspection/json) |
| urllib3 | 2.8.0 | 2.8.0 | current | [upstream](https://pypi.org/pypi/urllib3/json) |
| uvicorn | 0.53.0 | 0.53.0 | current | [upstream](https://pypi.org/pypi/uvicorn/json) |
| watchfiles | 1.2.0 | 1.2.0 | current | [upstream](https://pypi.org/pypi/watchfiles/json) |
| websockets | 17.1 | 17.1 | current | [upstream](https://pypi.org/pypi/websockets/json) |
| win_unicode_console | 0.5 | 0.5 | current | [upstream](https://pypi.org/pypi/win_unicode_console/json) |
| yara-x | 1.20.0 | 1.20.0 | current | [upstream](https://pypi.org/pypi/yara-x/json) |
| yarl | 1.25.1 | 1.25.1 | current | [upstream](https://pypi.org/pypi/yarl/json) |
| zipp | 4.1.0 | 4.1.0 | current | [upstream](https://pypi.org/pypi/zipp/json) |

### Lookup failures

None.
