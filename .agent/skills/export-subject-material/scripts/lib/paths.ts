/**
 * Centralised path constants for the export-roadmaps toolchain.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Root directory containing all roadmap asset folders. */
export const ROADMAPS_DIR = path.resolve(__dirname, '../../assets/roadmaps');

/** Output directory for generated JSON files. */
export const OUTPUT_DIR = path.resolve(__dirname, '../output');
