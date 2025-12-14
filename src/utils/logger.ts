const bool = (v: any, def: boolean) => {
  if (v === undefined || v === null) return def;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

const LOG_SERVICES = bool(process.env.LOG_SERVICES, true);
const LOG_ERRORS = bool(process.env.LOG_ERRORS, true);
const LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const cyan = '\x1b[36m';
const red = '\x1b[31m';
const gray = '\x1b[90m';
const reset = '\x1b[0m';

const ts = () => new Date().toISOString();

export const logger = {
  service(event: string, payload?: Record<string, any>) {
    if (!LOG_SERVICES) return;
    if (LEVEL === 'silent') return;
    const meta = payload ? ` ${JSON.stringify(payload)}` : '';
    console.log(`${cyan}[SERVICE]${reset} ${gray}${ts()}${reset} ${event}${meta}`);
  },
  error(event: string, err?: any) {
    if (!LOG_ERRORS) return;
    const detail = err?.message ? ` ${err.message}` : '';
    const stack = err?.stack ? `\n${err.stack}` : '';
    console.error(`${red}[ERROR]${reset} ${gray}${ts()}${reset} ${event}${detail}${stack}`);
  },
};

export default logger;