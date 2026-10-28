const os = require("os");
const fs = require("fs");
const path = require("path");

// La configuración se relee en cada ciclo para poder cambiarla sin reiniciar
const rutaConfig = path.join(__dirname, "config.json");
const leerConfig = () => JSON.parse(fs.readFileSync(rutaConfig, "utf8"));

function infoInicial() {
  console.log("== Información del sistema ==");
  console.log(`SO: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`Host: ${os.hostname()}`);
  console.log(`CPUs: ${os.cpus().length} x ${os.cpus()[0].model}`);
  console.log(`Memoria total: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`);
  console.log(`Node.js: ${process.version}`);
}

let cpuAnterior = process.cpuUsage();
let tAnterior = process.hrtime.bigint();

function mostrar(config) {
  const { cpu, memoria, tiempoSistema, tiempoNode } = config.mostrar;
  console.log(`\n-- ${new Date().toLocaleTimeString()} --`);
  if (cpu) {
    // Uso de CPU del proceso desde la última medida (us de CPU / us reales)
    const uso = process.cpuUsage(cpuAnterior);
    const ahora = process.hrtime.bigint();
    const real = Number(ahora - tAnterior) / 1000;
    cpuAnterior = process.cpuUsage();
    tAnterior = ahora;
    console.log(`CPU (proceso): ${(((uso.user + uso.system) / real) * 100).toFixed(1)}%`);
    console.log(`Carga del sistema (1 min): ${os.loadavg()[0].toFixed(2)}`);
  }
  if (memoria) {
    const m = process.memoryUsage();
    console.log(`Memoria node (RSS): ${(m.rss / 1024 ** 2).toFixed(1)} MB`);
    console.log(`Memoria libre del sistema: ${(os.freemem() / 1024 ** 3).toFixed(2)} GB`);
  }
  if (tiempoSistema) console.log(`Sistema activo: ${Math.round(os.uptime())} s`);
  if (tiempoNode) console.log(`Node ejecutándose: ${Math.round(process.uptime())} s`);
}

function ciclo() {
  const config = leerConfig();
  mostrar(config);
  setTimeout(ciclo, config.intervaloSegundos * 1000);
}

infoInicial();
ciclo();
