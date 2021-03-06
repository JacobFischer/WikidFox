import { resolve } from "path";
import { start } from "./start";

const PORT = 8080;

// tslint:disable:no-console

(async function startServer() {
    console.log("--- Server Starting ---");

    let server: any;
    try {
        server = await start(PORT, resolve(__dirname, "../client/"));
    } catch (err) {
        console.error(`Error starting server:`, err);
        process.exit(1);
    }

    console.log(`--- Server listening on port ${PORT} ---`);
})();
