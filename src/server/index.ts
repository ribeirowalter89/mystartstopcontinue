import { buildApp } from "./app";

const port = Number(process.env.PORT || 3001);

async function bootstrap() {
  const { httpServer } = await buildApp();
  httpServer.listen(port, () => {
    console.log(`Start-Stop-Continue server running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
