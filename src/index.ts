import { createServer } from "node:http";
import createExpressApplication from "./app.js";
import { env } from "./env.js";

async function main() {
  try {
    const server = createServer(createExpressApplication());
    server.listen(env.PORT, () =>
      console.log(`Server is running on  http://localhost:${env.PORT}`),
    );
  } catch (error) {
    console.log(`Something went wrong. ${error}`.red);
    process.exit(1);
  }
}

main();
