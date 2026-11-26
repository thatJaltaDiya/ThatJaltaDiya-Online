console.log("Vercel Node version:", process.version);

const { app } = await import("../src/app.js");

export default app;
