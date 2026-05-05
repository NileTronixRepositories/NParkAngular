import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ScanFileMessage } from './scan-hub.service';

export interface ScannerAttachment {
  name: string;
  url: string;
  safeUrl: SafeResourceUrl;
  type: string;
  file: File;
  bytes: ArrayBuffer | number[] | string | Blob;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScannerAttachmentService {
  private readonly sanitizer = inject(DomSanitizer);

  fromScanMessage(msg: ScanFileMessage): ScannerAttachment {
    const data = this.toUint8Array(msg.bytes);
    const blob = new Blob([data as BlobPart], { type: msg.contentType });
    const url = URL.createObjectURL(blob);
    const file = new File([blob], msg.fileName, {
      type: msg.contentType || 'application/octet-stream',
    });

    return {
      name: msg.fileName,
      url,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
      type: msg.contentType,
      file,
      bytes: msg.bytes,
      size: data.length,
    };
  }

  fromSnapshotBlob(blob: Blob, fileName = `gate-snapshot-${Date.now()}.jpg`): ScannerAttachment {
    const url = URL.createObjectURL(blob);
    const type = blob.type || 'image/jpeg';
    const file = new File([blob], fileName, { type });

    return {
      name: fileName,
      url,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
      type,
      file,
      bytes: blob,
      size: blob.size,
    };
  }

  revokeUrl(url: string | null | undefined): void {
    if (url) URL.revokeObjectURL(url);
  }

  private toUint8Array(bytes: ScanFileMessage['bytes'] | string): Uint8Array {
    if (typeof bytes === 'string') {
      const binaryString = window.atob(bytes);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }
      return data;
    }

    if (bytes instanceof ArrayBuffer) {
      return new Uint8Array(bytes);
    }

    return new Uint8Array(bytes as ArrayLike<number>);
  }
}
