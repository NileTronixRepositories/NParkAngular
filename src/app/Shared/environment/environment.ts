export type RuntimeEnvironment = {
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
  baseUrl: 'http://192.168.1.25/api',
  hubUrl: 'http://192.168.1.25/hubs/notifications',
  lprHubUrl: 'http://192.168.1.25/hubs/lpr',
  scanHubUrl: 'http://192.168.1.25:8003/hubs/scan',
  nfcBaseUrl: 'http://localhost:8003/api',
  printBaseUrl: 'http://localhost:9100/api',
  qrPrinterName: 'RONGTA 80mm Series Printer(1)',
  receiptPrinterName: 'XP-80C',
};

export async function loadRuntimeEnvironment(): Promise<void> {
  try {
    const response = await fetch(`./assets/app-config.json?v=${Date.now()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`Runtime config was not loaded: ${response.status} ${response.statusText}`);
      return;
    }

    const config = (await response.json()) as Partial<RuntimeEnvironment>;
    Object.assign(environment, config);
  } catch (error) {
    console.warn('Runtime config was not loaded. Using built-in environment defaults.', error);
  }
}
