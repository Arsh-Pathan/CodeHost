import Docker from 'dockerode';
import { logger } from '@codehost/logger';

export const docker = new Docker();

/**
 * Demux Docker Engine API multiplexed log framing (8-byte header: stream type + uint32BE size)
 * cleanly into UTF-8 text, falling back safely for plain TTY/unframed chunks.
 */
export function demuxDockerLogBuffer(chunk: Buffer): string {
  if (!chunk || chunk.length === 0) return '';

  let offset = 0;
  let output = '';
  let parsedFrame = false;

  while (offset + 8 <= chunk.length) {
    const streamType = chunk[offset];
    const hasZeroPadding =
      chunk[offset + 1] === 0 && chunk[offset + 2] === 0 && chunk[offset + 3] === 0;
    const isValidStreamType = streamType === 0 || streamType === 1 || streamType === 2;

    if (!isValidStreamType || !hasZeroPadding) {
      if (!parsedFrame) {
        return chunk.toString('utf8');
      }
      output += chunk.subarray(offset).toString('utf8');
      return output;
    }

    const frameSize = chunk.readUInt32BE(offset + 4);
    if (frameSize > 16 * 1024 * 1024) {
      if (!parsedFrame) {
        return chunk.toString('utf8');
      }
      output += chunk.subarray(offset).toString('utf8');
      return output;
    }

    parsedFrame = true;
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + frameSize;

    if (payloadEnd > chunk.length) {
      output += chunk.subarray(payloadStart).toString('utf8');
      return output;
    }

    if (frameSize > 0) {
      output += chunk.subarray(payloadStart, payloadEnd).toString('utf8');
    }
    offset = payloadEnd;
  }

  if (offset < chunk.length) {
    output += (parsedFrame ? chunk.subarray(offset) : chunk).toString('utf8');
  }

  return output;
}

export async function checkDockerHealth() {
  try {
    await docker.ping();
    logger.info('Docker connected');
    return true;
  } catch (error) {
    logger.error({ error }, 'Docker health check failed');
    return false;
  }
}

export default docker;
