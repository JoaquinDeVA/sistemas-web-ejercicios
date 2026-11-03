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

// Temperatura real de la CPU en Linux (en milésimas de °C); null si no hay sensor
function leerTemperatura() {
  try {
    const zonas = fs.readdirSync("/sys/class/thermal").filter((z) => z.startsWith("thermal_zone"));
    const temps = zonas.map((z) => Number(fs.readFileSync(`/sys/class/thermal/${z}/temp`, "utf8")) / 1000);
    return temps.length ? Math.max(...temps) : null;
  } catch {
    return null;
  }
}

// Barra de 20 caracteres con color: verde, amarillo o rojo según el umbral
function barra(valor, maximo, aviso, critico) {
  const llenos = Math.round(Math.min(valor / maximo, 1) * 20);
  const color = valor >= critico ? "\x1b[31m" : valor >= aviso ? "\x1b[33m" : "\x1b[32m";
  return `${color}${"█".repeat(llenos)}\x1b[90m${"░".repeat(20 - llenos)}\x1b[0m`;
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
    const porcentaje = ((uso.user + uso.system) / real) * 100;
    console.log(`CPU (proceso): ${porcentaje.toFixed(1)}%`);
    if (porcentaje > config.umbrales.cpuPorcentaje) console.warn(`AVISO: CPU por encima del ${config.umbrales.cpuPorcentaje}%`);
    console.log(`Carga del sistema (1 min): ${os.loadavg()[0].toFixed(2)}`);
    const temp = leerTemperatura();
    if (temp !== null) {
      const { avisoC, criticoC } = config.umbrales.temperatura;
      console.log(`Temperatura: ${barra(temp, 100, avisoC, criticoC)} ${temp.toFixed(0)} °C`);
      if (temp >= criticoC) console.warn(`AVISO: ${temp.toFixed(0)} °C, el portátil se va a frenar`);
    }
  }
  if (memoria) {
    const m = process.memoryUsage();
    console.log(`Memoria node (RSS): ${(m.rss / 1024 ** 2).toFixed(1)} MB`);
    const libreGB = os.freemem() / 1024 ** 3;
    console.log(`Memoria libre del sistema: ${libreGB.toFixed(2)} GB`);
    if (libreGB < config.umbrales.memoriaLibreGB) console.warn(`AVISO: queda menos de ${config.umbrales.memoriaLibreGB} GB de memoria libre`);
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
