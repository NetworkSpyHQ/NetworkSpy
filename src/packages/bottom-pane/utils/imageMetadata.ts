import exifr from 'exifr';

export interface ImageMeta {
  format: string;
  width: number;
  height: number;
  fileSize: string;
  contentType: string;

  basic: Record<string, string | number>;
  exif?: Record<string, any>;
  gps?: { latitude: number; longitude: number };
  png?: Record<string, string>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function extractImageMeta(
  body: Uint8Array,
  contentType: string,
): Promise<ImageMeta> {
  const format = contentType.split('/').pop()?.toUpperCase() || 'UNKNOWN';
  const fileSize = formatBytes(body.length);

  let width = 0;
  let height = 0;
  let basic: Record<string, string | number> = {};
  let exifData: Record<string, any> | undefined;
  let gpsData: { latitude: number; longitude: number } | undefined;
  let pngData: Record<string, string> | undefined;

  const isPng = contentType.includes('png') || (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4E && body[3] === 0x47);

  try {
    const parsed = await exifr.parse(body, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: false,
      icc: false,
      iptc: false,
      ifd1: false,
      mergeOutput: false,
      sanitize: true,
      translateKeys: true,
      reviveValues: true,
    });

    if (parsed) {
      if (parsed.ExifImageWidth && parsed.ExifImageHeight) {
        width = Number(parsed.ExifImageWidth);
        height = Number(parsed.ExifImageHeight);
      }

      const cameraTags: Record<string, any> = {};
      for (const key of ['Make', 'Model', 'ISO', 'FNumber', 'FocalLength', 'ExposureTime', 'DateTimeOriginal', 'Software', 'Orientation', 'ColorSpace', 'WhiteBalance', 'ExposureProgram', 'MeteringMode', 'Flash', 'LensModel']) {
        if (parsed[key] !== undefined) {
          cameraTags[key] = parsed[key];
        }
      }
      if (Object.keys(cameraTags).length > 0) {
        exifData = cameraTags;
      }
    }
  } catch {
    // exifr failed — not an EXIF-bearing format
  }

  try {
    const gps = await exifr.gps(body);
    if (gps) {
      gpsData = gps;
    }
  } catch {
    // no GPS
  }

  if (isPng && !width && !height) {
    try {
      const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
      if (dv.getUint32(0) === 0x89504E47) {
        width = dv.getUint32(16);
        height = dv.getUint32(20);
      }
    } catch {
      // corrupt PNG
    }
  }

  if (!width && !height) {
    if (body[0] === 0xFF && body[1] === 0xD8) {
      let offset = 2;
      while (offset < body.length - 1) {
        if (body[offset] !== 0xFF) break;
        const marker = body[offset + 1];
        if (marker === 0xD9) break;
        if (marker >= 0xC0 && marker <= 0xC3) {
          height = (body[offset + 5] << 8) | body[offset + 6];
          width = (body[offset + 7] << 8) | body[offset + 8];
          break;
        }
        const segLen = (body[offset + 2] << 8) | body[offset + 3];
        offset += 2 + segLen;
      }
    } else if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) {
      width = (body[6] & 0xFF) | ((body[7] & 0xFF) << 8);
      height = (body[8] & 0xFF) | ((body[9] & 0xFF) << 8);
    } else if (body[0] === 0x42 && body[1] === 0x4D) {
      const fileSize = body[2] | (body[3] << 8) | (body[4] << 16) | (body[5] << 24);
      const dataOffset = body[10] | (body[11] << 8) | (body[12] << 16) | (body[13] << 24);
      if (dataOffset >= 40) {
        width = (body[18] | (body[19] << 8) | (body[20] << 16) | (body[21] << 24));
        height = Math.abs(body[22] | (body[23] << 8) | (body[24] << 16) | (body[25] << 24));
      }
    } else if (body[0] === 0x52 && body[1] === 0x49 && body[2] === 0x46 && body[3] === 0x46) {
      if (body[8] === 0x57 && body[9] === 0x45 && body[10] === 0x42 && body[11] === 0x50) {
        const vp8xOffset = findChunk(body, 0x58503856);
        if (vp8xOffset) {
          width = ((body[vp8xOffset + 7] << 16) | (body[vp8xOffset + 6] << 8) | body[vp8xOffset + 5]) + 1;
          height = ((body[vp8xOffset + 10] << 16) | (body[vp8xOffset + 9] << 8) | body[vp8xOffset + 8]) + 1;
        } else {
          const vp8Offset = findChunk(body, 0x38505620);
          if (vp8Offset) {
            width = (body[vp8Offset + 9] << 8) | body[vp8Offset + 8];
            height = (body[vp8Offset + 11] << 8) | body[vp8Offset + 10];
          }
        }
      }
    }
  }

  basic = { "Dimensions": width && height ? `${width} × ${height}` : "Unknown" };
  if (format) basic["Format"] = format;
  if (width) basic["Width"] = width;
  if (height) basic["Height"] = height;

  return { format, width, height, fileSize, contentType, basic, exif: exifData, gps: gpsData, png: pngData };
}

function findChunk(data: Uint8Array, fourCC: number): number | null {
  let offset = 12;
  while (offset + 8 <= data.length) {
    const chunkSize = (data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24));
    const tag = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    if (tag === fourCC) return offset;
    offset += 8 + chunkSize + (chunkSize & 1);
  }
  return null;
}
