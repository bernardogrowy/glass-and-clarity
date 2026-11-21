import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const PORT = 5173;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const lan = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i && i.family === "IPv4" && !i.internal);

const url = `http://${lan?.address ?? "localhost"}:${PORT}`;
const qrFile = path.join(root, "mobile-qr.png");

await QRCode.toFile(qrFile, url, {
  width: 400,
  margin: 2,
  color: { dark: "#000000", light: "#FFFFFF" },
});

console.log(`\nURL: ${url}`);
console.log(`QR code salvo em: ${qrFile}\n`);

if (process.platform === "win32") {
  spawn("cmd", ["/c", "start", "", qrFile], { detached: true, stdio: "ignore" }).unref();
}

const vite = spawn(
  process.execPath,
  [
    path.join(root, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { stdio: "inherit", cwd: root },
);

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));
vite.on("exit", (code) => process.exit(code ?? 0));
