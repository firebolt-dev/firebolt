#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.js
var import_commander = require("commander");

// src/create.js
var import_fs_extra = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_child_process = require("child_process");

// src/utils/style.js
var import_chalk = __toESM(require("chalk"));
var dim = import_chalk.default.dim;
var mark = import_chalk.default.hex("#1ac4ff");
var info = import_chalk.default.bold.black.bgWhiteBright;
var change = import_chalk.default.bold.black.bgWhiteBright;
var error = import_chalk.default.bold.whiteBright.bgHex("#e74b4b");

// src/utils/log.js
function intro() {
  console.log("\n  \u{1F525} Firebolt\n");
}
function info2(...args) {
  console.log(info(" INF "), ...args);
}
function change2(...args) {
  console.log(change(" CHN "), ...args);
}
function error2(...args) {
  console.log(error(" ERR "), ...args);
}

// src/create.js
async function create(projectName) {
  const cwd = process.cwd();
  const projectDir = import_path.default.join(cwd, projectName);
  const templateDir = import_path.default.join(__dirname, "../project");
  intro();
  const projectDirExists = await import_fs_extra.default.exists(projectDir);
  if (projectDirExists) {
    return error2(`a directory with the name ${mark(projectName)} already exists.
`);
  }
  info2(`creating directory ${mark(`./${projectName}`)}`);
  await import_fs_extra.default.ensureDir(projectDir);
  info2(`initializing project`);
  await import_fs_extra.default.copy(templateDir, projectDir);
  info2(`personalizing project`);
  await replace(
    import_path.default.join(projectDir, "package.json"),
    "__projectName__",
    projectName
  );
  await replace(
    import_path.default.join(projectDir, "document.js"),
    "__projectName__",
    projectName
  );
  await replace(
    import_path.default.join(projectDir, "pages/index.js"),
    "__projectName__",
    projectName
  );
  info2(`initializing git repository`);
  (0, import_child_process.execSync)(`git init`, { cwd: projectDir, stdio: "ignore" });
  info2(`installing dependencies...`);
  (0, import_child_process.execSync)("npm install", { cwd: projectDir, stdio: "ignore" });
  console.log("\nYour project is ready!\n");
}
async function replace(file, target, value) {
  let content = await import_fs_extra.default.readFile(file, "utf8");
  content = content.replace(new RegExp(target, "g"), value);
  await import_fs_extra.default.writeFile(file, content);
}

// src/compile.js
var import_fs_extra5 = __toESM(require("fs-extra"));
var import_path6 = __toESM(require("path"));
var import_child_process2 = require("child_process");
var import_perf_hooks = require("perf_hooks");
var import_chokidar = __toESM(require("chokidar"));
var esbuild = __toESM(require("esbuild"));
var import_lodash2 = require("lodash");
var import_esbuild_plugin_polyfill_node = require("esbuild-plugin-polyfill-node");

// src/utils/reimport.js
function reimport(module2) {
  delete require.cache[module2];
  return import(`${module2}?v=${Date.now()}`);
}

// src/utils/getFilePaths.js
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_path2 = __toESM(require("path"));
async function getFilePaths(baseDir) {
  let filePaths = [];
  async function traverse(dir) {
    const files = await import_fs_extra2.default.readdir(dir);
    for (const file of files) {
      const filePath = import_path2.default.join(dir, file);
      const stat = await import_fs_extra2.default.stat(filePath);
      if (stat.isFile()) {
        filePaths.push(filePath);
      }
      if (stat.isDirectory()) {
        await traverse(filePath);
      }
    }
  }
  await traverse(baseDir);
  return filePaths;
}

// src/utils/fileToRoutePattern.js
function fileToRoutePattern(filePath) {
  filePath = filePath.split(".");
  filePath.pop();
  filePath = filePath.join("");
  filePath = filePath.split("_").filter((seg) => !!seg);
  const pattern = filePath.map((segment) => {
    if (segment === "/index") {
      return "";
    }
    if (segment.startsWith("$")) {
      segment = segment.slice(1);
      segment = ":" + segment;
    }
    if (segment.endsWith("+")) {
    }
    if (segment.endsWith("-")) {
      segment = segment.slice(0, -1);
      segment = segment + "*";
    }
    return segment;
  }).join("/");
  return pattern;
}

// src/utils/errors.js
var import_fs_extra3 = __toESM(require("fs-extra"));
var import_lodash = require("lodash");
var import_path3 = __toESM(require("path"));
var BundlerError = class extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
};
function getFileLine(file, line) {
  const data = import_fs_extra3.default.readFileSync(file, "utf-8");
  return data.split("\n")[line - 1];
}
function split(str, column, length) {
  const first = str.substring(0, column);
  const second = str.substring(column, column + length);
  const third = str.substring(column + length);
  return [first, second, third];
}
function parseEsbuildError(error3) {
  error3 = error3.errors[0];
  const name = "BuildError";
  const message = error3.text;
  const file = error3.location.file;
  const code = error3.location.lineText;
  const line = error3.location.line;
  const column = error3.location.column;
  const length = error3.location.length;
  const suggestion = error3.location.suggestion;
  return {
    name,
    message,
    file,
    code,
    line,
    column,
    length,
    suggestion
  };
}
function parseServerError(error3, appDir) {
  const name = error3.name;
  const message = error3.message;
  const lines = error3.stack.split("\n");
  let [, file, line, column] = match = lines[1].match(/\((.*):(\d+):(\d+)\)$/);
  const code = getFileLine(file, line);
  return {
    name,
    message,
    file: import_path3.default.relative(appDir, file),
    code,
    line: parseInt(line),
    column: parseInt(column) - 1,
    length: 0,
    suggestion: null
  };
}
function logCodeError({
  name,
  message,
  file,
  code,
  line,
  column,
  length,
  suggestion
}) {
  let line1 = `${name}: ${message}
`;
  error2(line1);
  let line2 = `    ${file}:${line}:${column}:`;
  console.log(line2);
  if (length) {
    let line3 = `${(0, import_lodash.padStart)(line, 6)} | `;
    const parts = split(code, column, length);
    parts[1] = mark(parts[1]);
    line3 += parts.join("");
    console.log(line3);
  } else {
    let line3 = `${(0, import_lodash.padStart)(line, 6)} | `;
    line3 += code;
    console.log(line3);
  }
  if (length) {
    let line4 = `       | ${(0, import_lodash.padStart)("", column)}${mark((0, import_lodash.padStart)("", length, "~"))}`;
    console.log(line4);
  } else {
    let line4 = `       | ${(0, import_lodash.padStart)("", column)}${mark("^")}`;
    console.log(line4);
  }
  if (suggestion) {
    let line5 = `       | ${(0, import_lodash.padStart)("", column)}${mark(suggestion)}`;
    console.log(line5);
  }
  console.log("");
}
function isEsbuildError(err) {
  return err.errors?.[0].location;
}

// src/utils/virtualModule.js
var import_path4 = __toESM(require("path"));
function virtualModule(modules) {
  return {
    name: "virtual-modules",
    setup(build2) {
      for (const module2 of modules) {
        const { path: path6, contents } = module2;
        const escapedPath = path6.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filter = new RegExp(`^${escapedPath}$`);
        const namespace = "ns" + Math.random();
        build2.onResolve({ filter }, (args) => {
          return { path: path6, namespace };
        });
        build2.onLoad({ filter: /.*/, namespace }, () => {
          return { contents, resolveDir: import_path4.default.dirname(path6) };
        });
      }
    }
  };
}

// src/utils/registryPlugin.js
var import_fs_extra4 = __toESM(require("fs-extra"));
var import_path5 = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
function registryPlugin({ registry }) {
  return {
    name: "registryPlugin",
    setup(build2) {
      build2.onLoad({ filter: /\.js$/ }, async (args) => {
        const modPath = args.path;
        if (modPath.includes("node_modules")) {
          return;
        }
        if (modPath.includes(".firebolt")) {
          return;
        }
        let contents = await import_fs_extra4.default.readFile(modPath, "utf8");
        let matches;
        const imports = {};
        const namedImportRegex = /import\s+{([^}]+)}\s+from\s+(['"][^'"]+['"])/g;
        while ((matches = namedImportRegex.exec(contents)) !== null) {
          const file = matches[2].slice(1).slice(0, -1);
          const bits = matches[1].split(",");
          bits.forEach((bit) => {
            const [name, alias] = bit.trim().split(/\s+as\s+/);
            const usedName = alias || name;
            imports[usedName.trim()] = {
              name: name.trim(),
              alias: alias?.trim() || null,
              file
            };
          });
        }
        const defaultImportRegex = /import\s+(\w+)\s+from\s+(['"][^'"]+['"])/g;
        while ((matches = defaultImportRegex.exec(contents)) !== null) {
          const file = matches[2].slice(1).slice(0, -1);
          const name = matches[1].trim();
          imports[name] = {
            name,
            alias: null,
            file
          };
        }
        contents = await transform({
          modPath,
          imports,
          contents,
          hook: "useData",
          registry
        });
        contents = await transform({
          modPath,
          imports,
          contents,
          hook: "useAction",
          registry
        });
        return { contents, loader: "jsx" };
      });
    }
  };
}
async function transform({ modPath, imports, contents, hook, registry }) {
  const usesHook = contents.includes(`${hook}(`);
  if (!usesHook)
    return contents;
  const dataRegex = new RegExp(`${hook}\\s*\\(\\s*([^,)]+)`, "g");
  let dataMatches;
  const fnNames = [];
  while ((dataMatches = dataRegex.exec(contents)) !== null) {
    fnNames.push(dataMatches[1].trim());
  }
  const fnInfo = [];
  for (const fnName of fnNames) {
    if (imports[fnName]) {
      const name = imports[fnName].name;
      const alias = imports[fnName].alias;
      const file = import_path5.default.resolve(import_path5.default.dirname(modPath), imports[fnName].file);
      const fullPath = `${file}${alias || name}`;
      const id = "f" + import_crypto.default.createHash("sha256").update(fullPath).digest("hex");
      fnInfo.push({ name, alias, file, id });
    } else {
      const name = fnName;
      const alias = null;
      const file = modPath;
      const fullPath = `${file}${name}`;
      const id = "f" + import_crypto.default.createHash("sha256").update(fullPath).digest("hex");
      fnInfo.push({ name, alias, file, id });
    }
  }
  for (const item of fnInfo) {
    const fnName = item.alias || item.name;
    const oldFnRegexPattern = `${hook}\\s*\\(\\s*${fnName}\\s*([^,)]*)`;
    const oldFnRegex = new RegExp(oldFnRegexPattern, "g");
    contents = contents.replace(oldFnRegex, `${hook}('${item.id}'$1`);
  }
  if (registry) {
    for (const item of fnInfo) {
      registry[item.id] = { file: item.file, fnName: item.name };
    }
  }
  return contents;
}

// src/compile.js
async function compile(opts) {
  const prod = !!opts.production;
  const env = prod ? "production" : "development";
  const dir = __dirname;
  const appDir = process.cwd();
  const appPagesDir = import_path6.default.join(appDir, "pages");
  const appApiDir = import_path6.default.join(appDir, "api");
  const appConfigFile = import_path6.default.join(appDir, "firebolt.config.js");
  const buildDir = import_path6.default.join(appDir, ".firebolt");
  const buildPageShimsDir = import_path6.default.join(appDir, ".firebolt/page-shims");
  const buildCoreFile = import_path6.default.join(appDir, ".firebolt/core.js");
  const buildConfigFile = import_path6.default.join(appDir, ".firebolt/config.js");
  const buildManifestFile = import_path6.default.join(appDir, ".firebolt/manifest.json");
  const buildLibFile = import_path6.default.join(appDir, ".firebolt/lib.js");
  const buildBoostrapFile = import_path6.default.join(appDir, ".firebolt/bootstrap.js");
  const buildRegistryFile = import_path6.default.join(appDir, ".firebolt/registry.js");
  const buildServerFile = import_path6.default.join(appDir, ".firebolt/server.js");
  const extrasDir = import_path6.default.join(dir, "../extras");
  const serverServerFile = import_path6.default.join(appDir, ".firebolt/server/index.js");
  const tmpConfigFile = import_path6.default.join(appDir, ".firebolt/tmp/config.js");
  const tmpCoreFile = import_path6.default.join(appDir, ".firebolt/tmp/core.js");
  let firstBuild = true;
  let config;
  intro();
  async function build2() {
    const startAt = import_perf_hooks.performance.now();
    info2(`${firstBuild ? "building..." : "rebuilding..."}`);
    await import_fs_extra5.default.emptyDir(buildDir);
    if (!await import_fs_extra5.default.exists(appConfigFile)) {
      throw new BundlerError(`missing ${$mark("firebolt.config.js")} file`);
    }
    const configCode = `
      export { default as getConfig } from '../firebolt.config.js'
    `;
    await import_fs_extra5.default.writeFile(buildConfigFile, configCode);
    await esbuild.build({
      entryPoints: [buildConfigFile],
      outfile: tmpConfigFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: false,
      platform: "node",
      packages: "external",
      logLevel: "silent",
      define: {
        "process.env.NODE_ENV": JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env)
      },
      loader: {
        ".js": "jsx"
      },
      jsx: "automatic",
      jsxImportSource: "firebolt-css",
      plugins: []
    });
    const { getConfig } = await reimport(tmpConfigFile);
    config = getConfig();
    (0, import_lodash2.defaultsDeep)(config, {
      port: 3e3,
      external: [],
      productionBrowserSourceMaps: false
    });
    const manifest = {
      pageFiles: {},
      bootstrapFile: null
    };
    const pageFiles = await getFilePaths(appPagesDir);
    let ids = 0;
    const routes = [];
    for (const pageFile of pageFiles) {
      const id = `route${++ids}`;
      const prettyFileBase = import_path6.default.relative(appDir, pageFile);
      const pageFileBase = import_path6.default.relative(appPagesDir, pageFile);
      const shimFile = import_path6.default.join(buildPageShimsDir, pageFileBase.replace("/", "."));
      const shimFileName = import_path6.default.relative(import_path6.default.dirname(shimFile), shimFile);
      const pattern = fileToRoutePattern("/" + pageFileBase);
      const relBuildToPageFile = import_path6.default.relative(buildDir, pageFile);
      const relShimToPageFile = import_path6.default.relative(import_path6.default.dirname(shimFile), pageFile);
      routes.push({
        id,
        prettyFileBase,
        pattern,
        shimFile,
        shimFileName,
        relBuildToPageFile,
        relShimToPageFile
      });
    }
    routes.sort((a, b) => {
      const isDynamicA = a.pattern.includes(":");
      const isDynamicB = b.pattern.includes(":");
      if (isDynamicA && !isDynamicB) {
        return 1;
      } else if (!isDynamicA && isDynamicB) {
        return -1;
      }
      return 0;
    });
    await import_fs_extra5.default.copy(extrasDir, buildDir);
    const coreCode = `
      ${routes.map((route) => `import * as ${route.id} from '${route.relBuildToPageFile}'`).join("\n")}
      export const routes = [
        ${routes.map((route) => {
      return `
            {
              module: ${route.id},
              id: '${route.id}',
              prettyFileBase: '${route.prettyFileBase}',
              pattern: '${route.pattern}',
              shimFile: '${route.shimFile}',
              shimFileName: '${route.shimFileName}',
              relBuildToPageFile: '${route.relBuildToPageFile}',
              relShimToPageFile: '${route.relShimToPageFile}',
              Page: ${route.id}.default,
            },
          `;
    }).join("\n")}
      ]
    `;
    await import_fs_extra5.default.outputFile(buildCoreFile, coreCode);
    await esbuild.build({
      entryPoints: [buildCoreFile],
      outfile: tmpCoreFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: false,
      platform: "node",
      // format: 'esm',
      packages: "external",
      // external: ['react', 'react-dom', 'firebolt-css', ...config.external],
      // external: [...config.external],
      logLevel: "silent",
      alias: {
        firebolt: buildLibFile
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env)
      },
      loader: {
        ".js": "jsx"
      },
      jsx: "automatic",
      jsxImportSource: "firebolt-css",
      plugins: []
    });
    const core = await reimport(tmpCoreFile);
    for (const route of core.routes) {
      if (!route.Page) {
        throw new BundlerError(
          `missing default export for ${$mark(route.prettyFileBase)}`
        );
      }
    }
    for (const route of routes) {
      const code = `
        import Page from '${route.relShimToPageFile}'
        globalThis.$firebolt.push('registerPage', '${route.id}', Page)
      `;
      await import_fs_extra5.default.outputFile(route.shimFile, code);
    }
    const registry = {};
    const publicDir = import_path6.default.join(buildDir, "public");
    const publicFiles = [];
    for (const route of routes) {
      publicFiles.push(route.shimFile);
    }
    publicFiles.push(buildBoostrapFile);
    const bundleResult = await esbuild.build({
      entryPoints: publicFiles,
      entryNames: "/[name]-[hash]",
      outdir: publicDir,
      bundle: true,
      treeShaking: true,
      sourcemap: prod ? config.productionBrowserSourceMaps : true,
      splitting: true,
      platform: "browser",
      // mainFields: ["browser", "module", "main"],
      // external: ['fs', 'path', 'util', /*...config.external*/],
      format: "esm",
      minify: prod,
      metafile: true,
      logLevel: "silent",
      alias: {
        firebolt: buildLibFile
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env)
      },
      loader: {
        ".js": "jsx"
      },
      jsx: "automatic",
      jsxImportSource: "firebolt-css",
      keepNames: !prod,
      plugins: [
        registryPlugin({ registry })
        // polyfill fs, path etc for browser environment
        // polyfillNode({}),
        // ensure pages are marked side-effect free for tree shaking
        // {
        //   name: 'no-side-effects',
        //   setup(build) {
        //     build.onResolve({ filter: /.*/ }, async args => {
        //       // ignore this if we called ourselves
        //       if (args.pluginData) return
        //       console.log(args.path)
        //       const { path, ...rest } = args
        //       // avoid infinite recursion
        //       rest.pluginData = true
        //       const result = await build.resolve(path, rest)
        //       result.sideEffects = false
        //       return result
        //     })
        //   },
        // },
      ]
    });
    const metafile = bundleResult.metafile;
    for (const file in metafile.outputs) {
      const output = metafile.outputs[file];
      if (output.entryPoint) {
        if (output.entryPoint.startsWith(".firebolt/page-shims/")) {
          const shimFileName = output.entryPoint.replace(".firebolt/page-shims/", "");
          const route = routes.find((route2) => {
            return route2.shimFileName === shimFileName;
          });
          manifest.pageFiles[route.id] = file.replace(
            ".firebolt/public",
            "/_firebolt"
          );
        }
        if (output.entryPoint === ".firebolt/bootstrap.js") {
          manifest.bootstrapFile = file.replace(".firebolt/public", "/_firebolt");
        }
      }
    }
    await import_fs_extra5.default.outputFile(buildManifestFile, JSON.stringify(manifest, null, 2));
    const getRegistryRelPath = (file) => import_path6.default.relative(buildDir, file);
    const registryCode = `
      ${Object.keys(registry).map(
      (id) => `export { ${registry[id].fnName} as ${id} } from '${getRegistryRelPath(registry[id].file)}'`
    ).join("\n")}      
    `;
    await import_fs_extra5.default.outputFile(buildRegistryFile, registryCode);
    await esbuild.build({
      entryPoints: [buildServerFile],
      outfile: serverServerFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
      platform: "node",
      // format: 'esm',
      packages: "external",
      logLevel: "silent",
      alias: {
        firebolt: buildLibFile
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env)
      },
      loader: {
        ".js": "jsx"
      },
      jsx: "automatic",
      jsxImportSource: "firebolt-css",
      keepNames: !prod,
      plugins: [
        registryPlugin({ registry: null }),
        // dont write to registry, we already have it from the client
        virtualModule([
          {
            path: buildCoreFile,
            contents: coreCode
          }
        ])
      ]
    });
    const elapsed = (import_perf_hooks.performance.now() - startAt).toFixed(0);
    info2(`${firstBuild ? "built" : "rebuilt"} ${dim(`(${elapsed}ms)`)}
`);
    firstBuild = false;
  }
  let server;
  let controller;
  async function serve() {
    let SILENT_STARTUP;
    if (server) {
      SILENT_STARTUP = config && config.port === server.port ? "yes" : void 0;
    }
    if (server) {
      await new Promise((resolve) => {
        server.once("exit", resolve);
        controller.abort();
      });
      controller = null;
      server = null;
    }
    controller = new AbortController();
    server = (0, import_child_process2.fork)(serverServerFile, {
      signal: controller.signal,
      env: { SILENT_STARTUP }
    });
    server.port = config?.port;
    server.on("error", (err) => {
      if (err.code === "ABORT_ERR")
        return;
      console.log("server error");
      console.error(err);
    });
    await new Promise((resolve) => {
      server.once("message", (msg) => {
        if (msg === "ready")
          resolve();
      });
    });
    server.on("message", (msg) => {
      if (msg.type === "error") {
        logCodeError(parseServerError(msg.error, appDir));
      }
    });
  }
  process.on("exit", () => {
    controller?.abort();
  });
  let runInProgress = false;
  let runPending = false;
  const run = async () => {
    if (runInProgress) {
      runPending = true;
      return;
    }
    runInProgress = true;
    if (opts.build) {
      try {
        await build2();
      } catch (err) {
        if (err instanceof BundlerError) {
          error2(err.message);
        } else if (isEsbuildError(err)) {
          logCodeError(parseEsbuildError(err));
        } else {
          error2("\n");
          console.error(err);
        }
        runInProgress = false;
        runPending = false;
        return;
      }
    }
    if (opts.serve && !runPending) {
      await serve();
    }
    runInProgress = false;
    if (runPending) {
      runPending = false;
      run();
    }
  };
  await run();
  if (opts.watch) {
    const watchOptions = {
      ignoreInitial: true,
      ignored: ["**/.firebolt/**"]
    };
    const watcher = import_chokidar.default.watch([appDir], watchOptions);
    const onChange = async (type, file) => {
      change2(`~/${import_path6.default.relative(appDir, file)}`);
      run();
    };
    watcher.on("all", (0, import_lodash2.debounce)(onChange));
  }
  if (!opts.serve && !opts.watch) {
    process.exit();
  }
}

// src/index.js
var program = new import_commander.Command();
program.name("firebolt").description("A description").version("1.0.0");
program.command("create").argument("<name>", "the project name").action((name) => {
  create(name);
});
program.command("dev").action(() => {
  compile({ build: true, watch: true, serve: true });
});
program.command("build").action(() => {
  compile({ build: true, production: true });
});
program.command("start").action(() => {
  compile({ serve: true });
});
program.parse();
//# sourceMappingURL=index.js.map
