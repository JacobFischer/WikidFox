// import cors from "cors";
import express from "express";
import { Server } from "http";
import { resolve } from "path";
import { preloadAll } from "react-loadable";
import { Manifest } from 'react-loadable/webpack'
import { DIST_PATH_CLIENT, DIST_PATH_REACT_LOADABLES_MANIFEST, STATIC_BUNDLE_DIR } from "../shared/build";
import { routeExists } from "../shared/routes";
import { readFile } from "fs-extra";
import { render } from "./render";

const rootDir = (...paths: string[]) => resolve(__dirname, "../../", ...paths);

async function getReactLoadablesManifest(): Promise<Manifest> {
    const manifestFile = await readFile(rootDir(DIST_PATH_REACT_LOADABLES_MANIFEST));
    return JSON.parse(manifestFile.toString()); // technically type unsafe
}

async function getMainScripts(): Promise<string> {
    const indexHtml = await readFile(rootDir(DIST_PATH_CLIENT, "index.html"));
    const indexHtmlScripts = indexHtml.toString().match(/<script(.*?)<\/script>/g);

    /* istanbul ignore else: we never expect this to happen, check is to appease TypeScript */
    if (indexHtmlScripts) {
        return indexHtmlScripts.join("");
    } else {
        throw new Error("No main scripts!");
    }
}

export async function start(port: number, clientSideRendering: boolean) {
    await preloadAll(); // don't even start express till react-loadable is preloaded

    const app = express();

    if (clientSideRendering) {
        app.use(`/static`, express.static(rootDir(DIST_PATH_CLIENT, STATIC_BUNDLE_DIR)));
    }

    const csrData = clientSideRendering && {
        mainScripts: await getMainScripts(),
        manifest: await getReactLoadablesManifest(),
        preloaded: true,
    } || undefined;

    app.get("*", (req, res) => {
        if (!routeExists(req.url)) {
            res.status(404);
        }

        return render(res, req.url, csrData);
    });

    return new Promise<Server>((resolve) => {
        const server = app.listen(port, () => resolve(server));
    });
}
