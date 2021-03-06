import { Server } from "http";
import puppeteer from "puppeteer";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { getScriptsFromIndexHtml } from "../../src/server/build";
import { start } from "../../src/server/start";
import { templateHtml } from "../../src/shared/build";
import { App } from "../../src/shared/components/App";
import { closeServer, getClientDistDir, isPortTaken } from "../utils";

let browser = undefined as any as puppeteer.Browser; // will be set first below
let clientDistDir = "";
beforeAll(async () => {
    browser = await puppeteer.launch();
    clientDistDir = await getClientDistDir();
});

afterAll(async () => {
    await browser.close();
});

describe("Server", () => [
    ["with only server side rendering", 8080, false] as const,
    ["with client side rendering", 9090, true] as const,
].forEach(([description, port, clientSideRendering]) => describe(description, () => {
    const getDistDir = () => clientSideRendering
        ? clientDistDir // wrap in function due to async before all above
        : null;

    it("has a port to bind to", async () => {
        expect(port).toBeGreaterThan(0);
        const portTaken = await isPortTaken(port);
        expect(portTaken).toBe(false);
    });

    it("starts and closes", async () => {
        const server = await start(port, getDistDir());
        expect(server).toBeInstanceOf(Server);
        expect(server.listening).toBe(true);

        await closeServer(server);
        expect(server.listening).toBe(false);
    });

    it("serves the page", async () => {
        const server = await start(port, getDistDir());
        const location = "/";
        const page = await browser.newPage();
        page.on("error", (err) => fail(err));
        await page.setCacheEnabled(false);
        await page.setJavaScriptEnabled(false); // loadables will start loading and change expected body text

        const response = await page.goto(`http://localhost:${port}${location}`);
        expect(response).toBeTruthy();
        if (response) {
            expect(response.status()).toStrictEqual(200);
        } else {
            throw new Error("No response!");
        }

        const expectedBody = templateHtml(
            renderToString(
                <StaticRouter location={location}>
                    <App />
                </StaticRouter>,
            ),
            clientSideRendering
                ? await getScriptsFromIndexHtml(getDistDir() || "")
                : "",
        );

        const body = await page.content();
        expect(body).toEqual(expectedBody);

        // now test with js to make sure it just renders
        await page.setJavaScriptEnabled(true);
        await page.reload();
        await page.waitFor(1000);
        const jsBody = await page.content();
        expect(typeof jsBody).toBe("string");
        // it should be some string,
        // we can't know for certain how because of how loadables will or will not mutate it however,
        expect(jsBody.length).toBeGreaterThan(0);

        if (!clientSideRendering) {
            // server side render should not change when the client renders it
            expect(jsBody).toEqual(body);
        }
        // else client side rendering took over, and loadables may have already mutated the page

        await page.close();
        await closeServer(server);
    }, 12500); // these are long with puppeteer working
})));
