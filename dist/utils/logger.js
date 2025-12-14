"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const bool = (v, def) => {
    if (v === undefined || v === null)
        return def;
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
exports.logger = {
    service(event, payload) {
        if (!LOG_SERVICES)
            return;
        if (LEVEL === 'silent')
            return;
        const meta = payload ? ` ${JSON.stringify(payload)}` : '';
        console.log(`${cyan}[SERVICE]${reset} ${gray}${ts()}${reset} ${event}${meta}`);
    },
    error(event, err) {
        if (!LOG_ERRORS)
            return;
        const detail = err?.message ? ` ${err.message}` : '';
        const stack = err?.stack ? `\n${err.stack}` : '';
        console.error(`${red}[ERROR]${reset} ${gray}${ts()}${reset} ${event}${detail}${stack}`);
    },
};
exports.default = exports.logger;
