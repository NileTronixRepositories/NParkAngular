export type RuntimeEnvironment = {
  serverUrl?: string;
  scanHubPort?: number;
  baseUrl: string;
  hubUrl: string;
  lprHubUrl: string;
  scanHubUrl: string;
  nfcBaseUrl: string;
  printBaseUrl: string;
  qrPrinterName: string;
  receiptPrinterName: string;
};

export const environment: RuntimeEnvironment = {
  serverUrl: 'http://192.168.1.25',
  scanHubPort: 8003,
  baseUrl: 'http://192.168.1.25/api',
  hubUrl: 'http://192.168.1.25/hubs/notifications',
  lprHubUrl: 'http://192.168.1.25/hubs/lpr',
  scanHubUrl: 'http://192.168.1.25:8003/hubs/scan',
  nfcBaseUrl: 'http://localhost:8003/api',
  printBaseUrl: 'http://localhost:9100/api',
  qrPrinterName: 'RONGTA 80mm Series Printer(1)',
  receiptPrinterName: 'XP-80C',
};

function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

function buildScanHubUrl(serverUrl: string, scanHubPort: number): string {
  try {
    const parsed = new URL(serverUrl);
    return `${parsed.protocol}//${parsed.hostname}:${scanHubPort}/hubs/scan`;
  } catch {
    return `${serverUrl}:${scanHubPort}/hubs/scan`;
  }
}

export function applyRuntimeConfig(config: Partial<RuntimeEnvironment>): void {
  const derived: Partial<RuntimeEnvironment> = {};

  if (typeof config.serverUrl === 'string' && config.serverUrl.trim()) {
    const normalizedServerUrl = normalizeServerUrl(config.serverUrl);
    const scanHubPort =
      typeof config.scanHubPort === 'number' && config.scanHubPort > 0
        ? config.scanHubPort
        : (environment.scanHubPort ?? 8003);

    derived.serverUrl = normalizedServerUrl;
    derived.scanHubPort = scanHubPort;
    derived.baseUrl = `${normalizedServerUrl}/api`;
    derived.hubUrl = `${normalizedServerUrl}/hubs/notifications`;
    derived.lprHubUrl = `${normalizedServerUrl}/hubs/lpr`;
    derived.scanHubUrl = buildScanHubUrl(normalizedServerUrl, scanHubPort);
  }

  Object.assign(environment, derived, config);
  if (derived.serverUrl) {
    environment.serverUrl = derived.serverUrl;
  }
}

async function fetchConfigJson(path: string): Promise<Partial<RuntimeEnvironment> | null> {
  try {
    const response = await fetch(`${path}?v=${Date.now()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Partial<RuntimeEnvironment>;
  } catch {
    return null;
  }
}

export async function loadRuntimeEnvironment(): Promise<void> {
  const config =
    (await fetchConfigJson('./app.config.json')) ??
    (await fetchConfigJson('./assets/app-config.json'));

  if (!config) {
    console.warn('Runtime config was not loaded. Using built-in environment defaults.');
    return;
  }

  applyRuntimeConfig(config);
}
