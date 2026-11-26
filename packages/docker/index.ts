import { StringDecoder } from 'string_decoder';
import Docker from 'dockerode';
import { logger } from '@codehost/logger';

export const docker = new Docker();

/**
 * Stateful stream demuxer for Docker Engine multiplexed log streams (8-byte header + payload).
 * Reassembles frames and multi-byte UTF-8 sequences split across TCP chunks, while
 * falling back cleanly to plain TTY output for non-multiplexed streams.
 */
export function createDockerLogDemuxer(): (chunk: Buffer) => string {
  let remainder: Buffer = Buffer.alloc(0);
  let mode: 'unknown' | 'multiplexed' | 'tty' = 'unknown';
  const ttyDecoder = new StringDecoder('utf8');
  const stdoutDecoder = new StringDecoder('utf8');
  const stderrDecoder = new StringDecoder('utf8');

  return (chunk: Buffer): string => {
    if (!chunk || chunk.length === 0) return '';

    if (mode === 'tty') {
      return ttyDecoder.write(chunk);
    }

    const combined = remainder.length > 0 ? Buffer.concat([remainder, chunk]) : chunk;
    let offset = 0;
    let output = '';

    while (offset + 8 <= combined.length) {
      const streamType = combined[offset];
      const hasZeroPadding =
        combined[offset + 1] === 0 &&
        combined[offset + 2] === 0 &&
        combined[offset + 3] === 0;
      const isValidStreamType = streamType === 0 || streamType === 1 || streamType === 2;
      const frameSize = combined.readUInt32BE(offset + 4);

      if (!isValidStreamType || !hasZeroPadding || frameSize > 16 * 1024 * 1024) {
        if (mode === 'unknown') {
          mode = 'tty';
          remainder = Buffer.alloc(0);
          return ttyDecoder.write(combined.subarray(offset));
        }
        // Recover cleanly if non-framed bytes appear mid-stream
        output += combined.subarray(offset).toString('utf8');
        remainder = Buffer.alloc(0);
        return output;
      }

      mode = 'multiplexed';
      const payloadStart = offset + 8;
      const payloadEnd = payloadStart + frameSize;

      if (payloadEnd > combined.length) {
        break;
      }

      if (frameSize > 0) {
        const decoder = streamType === 2 ? stderrDecoder : stdoutDecoder;
        output += decoder.write(combined.subarray(payloadStart, payloadEnd));
      }
      offset = payloadEnd;
    }

    remainder = offset < combined.length ? Buffer.from(combined.subarray(offset)) : Buffer.alloc(0);
    return output;
  };
}

/**
 * Demux a single Docker Engine API multiplexed log buffer (e.g. non-streaming logs)
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

  if (offset < chunk.length && !parsedFrame) {
    output += chunk.toString('utf8');
  } else if (offset < chunk.length && parsedFrame) {
    // Remaining trailing bytes shorter than 8-byte header are dropped only if empty/partial header;
    // avoid leaking raw control headers while preserving printable ASCII text if non-null.
    const tail = chunk.subarray(offset);
    if (tail[0] > 0x02) {
      output += tail.toString('utf8');
    }
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
