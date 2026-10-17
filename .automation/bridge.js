/**
 * Personal Finance Super App - Local Report Bridge Foundation
 * Phase A2 - Safe Report Queue Processor
 *
 * Built-in Node.js modules only (node:fs, node:path, node:crypto, node:url).
 * Native ES Module matching "type": "module" in package.json.
 * No background daemons, no network requests, no arbitrary command execution.
 * Deterministic one-shot queue processing with strict schema validation,
 * duplicate detection, safe destination checks, and manual emergency stop.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory paths
const AUTOMATION_ROOT = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(AUTOMATION_ROOT, '..');

export const DIRS = {
  schema: path.join(AUTOMATION_ROOT, 'schema'),
  templates: path.join(AUTOMATION_ROOT, 'templates'),
  reportsPending: path.join(AUTOMATION_ROOT, 'reports', 'pending'),
  reportsProcessed: path.join(AUTOMATION_ROOT, 'reports', 'processed'),
  reportsRejected: path.join(AUTOMATION_ROOT, 'reports', 'rejected'),
  logs: path.join(AUTOMATION_ROOT, 'logs'),
};

const LOG_FILE = path.join(DIRS.logs, 'bridge.log');
const SCHEMA_FILE = path.join(DIRS.schema, 'report.schema.json');

// Emergency stop sentinel filenames
export const STOP_SENTINELS = [
  path.join(AUTOMATION_ROOT, 'STOP'),
  path.join(AUTOMATION_ROOT, 'EMERGENCY_STOP'),
  path.join(PROJECT_ROOT, 'STOP'),
  path.join(PROJECT_ROOT, 'EMERGENCY_STOP'),
];

/**
 * Append-only structured logger with secret redaction
 */
export function log(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  // Basic sanitization against tokens / private patterns
  const safeMessage = String(message)
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9]{20,}/gi, 'sk-[REDACTED]');

  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}${
    meta ? ' ' + JSON.stringify(meta) : ''
  }\n`;

  try {
    if (!fs.existsSync(DIRS.logs)) {
      fs.mkdirSync(DIRS.logs, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }

  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] ${safeMessage}`);
  } else {
    console.log(`[${level.toUpperCase()}] ${safeMessage}`);
  }
}

/**
 * Check if a manual emergency stop sentinel file exists
 */
export function checkEmergencyStop() {
  for (const sentinel of STOP_SENTINELS) {
    if (fs.existsSync(sentinel)) {
      return sentinel;
    }
  }
  return null;
}

/**
 * Ensure required directory structure exists
 */
export function ensureDirectories() {
  for (const dirPath of Object.values(DIRS)) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Load formal report JSON schema
 */
export function loadSchema() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(`Schema file not found at: ${SCHEMA_FILE}`);
  }
  const raw = fs.readFileSync(SCHEMA_FILE, 'utf8');
  return JSON.parse(raw);
}

/**
 * Compute SHA-256 hash of file content for deduplication
 */
export function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate a parsed report object strictly against report.schema.json
 */
export function validateReportData(data, schema) {
  const errors = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return ['Report root must be a non-null JSON object'];
  }

  // 1. Check required properties
  for (const req of schema.required) {
    if (!(req in data)) {
      errors.push(`Missing required property: "${req}"`);
    }
  }

  // 2. Additional properties check (additionalProperties: false)
  for (const key of Object.keys(data)) {
    if (!schema.properties[key]) {
      errors.push(`Unexpected property: "${key}"`);
    }
  }

  // 3. Schema version
  if (typeof data.schema_version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(data.schema_version)) {
    errors.push(`Invalid schema_version: "${data.schema_version}" (must match SemVer X.Y.Z)`);
  }

  // 4. task_id & phase
  if (typeof data.task_id !== 'string' || data.task_id.trim().length === 0) {
    errors.push('task_id must be a non-empty string');
  }
  if (typeof data.phase !== 'string' || data.phase.trim().length === 0) {
    errors.push('phase must be a non-empty string');
  }

  // 5. task_status enum
  if (!schema.properties.task_status.enum.includes(data.task_status)) {
    errors.push(`Invalid task_status: "${data.task_status}". Must be one of: ${schema.properties.task_status.enum.join(', ')}`);
  }

  // 6. summary
  if (typeof data.summary !== 'string' || data.summary.trim().length === 0) {
    errors.push('summary must be a non-empty string');
  }

  // 7. changed_files
  if (!Array.isArray(data.changed_files) || !data.changed_files.every((f) => typeof f === 'string' && f.trim().length > 0)) {
    errors.push('changed_files must be an array of non-empty strings');
  }

  // 8. commands_run
  if (!Array.isArray(data.commands_run)) {
    errors.push('commands_run must be an array');
  } else {
    data.commands_run.forEach((item, idx) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`commands_run[${idx}] must be an object`);
        return;
      }
      if (typeof item.command !== 'string' || item.command.trim().length === 0) {
        errors.push(`commands_run[${idx}].command must be a non-empty string`);
      }
      if (!Number.isInteger(item.exit_code)) {
        errors.push(`commands_run[${idx}].exit_code must be an integer`);
      }
      if ('stdout_summary' in item && typeof item.stdout_summary !== 'string') {
        errors.push(`commands_run[${idx}].stdout_summary must be a string if provided`);
      }
      for (const k of Object.keys(item)) {
        if (!['command', 'exit_code', 'stdout_summary'].includes(k)) {
          errors.push(`commands_run[${idx}] has unexpected property "${k}"`);
        }
      }
    });
  }

  // 9. build_result enum
  if (!schema.properties.build_result.enum.includes(data.build_result)) {
    errors.push(`Invalid build_result: "${data.build_result}". Must be one of: ${schema.properties.build_result.enum.join(', ')}`);
  }

  // 10. test_results
  if (typeof data.test_results !== 'string' || data.test_results.trim().length === 0) {
    errors.push('test_results must be a non-empty string');
  }

  // 11. errors & risks arrays
  if (!Array.isArray(data.errors) || !data.errors.every((e) => typeof e === 'string')) {
    errors.push('errors must be an array of strings');
  }
  if (!Array.isArray(data.risks) || !data.risks.every((r) => typeof r === 'string')) {
    errors.push('risks must be an array of strings');
  }

  // 12. next_recommended_action
  if (typeof data.next_recommended_action !== 'string' || data.next_recommended_action.trim().length === 0) {
    errors.push('next_recommended_action must be a non-empty string');
  }

  // 13. project_progress_percent (0.0 to 100.0)
  if (typeof data.project_progress_percent !== 'number' || isNaN(data.project_progress_percent) || data.project_progress_percent < 0 || data.project_progress_percent > 100) {
    errors.push(`project_progress_percent must be a number between 0 and 100, received: ${data.project_progress_percent}`);
  }

  // 14. verification_type enum
  if (!schema.properties.verification_type.enum.includes(data.verification_type)) {
    errors.push(`Invalid verification_type: "${data.verification_type}". Must be one of: ${schema.properties.verification_type.enum.join(', ')}`);
  }

  // 15. timestamp ISO 8601
  if (typeof data.timestamp !== 'string') {
    errors.push('timestamp must be an ISO 8601 string');
  } else {
    const d = new Date(data.timestamp);
    if (isNaN(d.getTime())) {
      errors.push(`Invalid timestamp format: "${data.timestamp}"`);
    }
  }

  return errors;
}

/**
 * Helper to create catalog entry with string representation
 */
function makeCatalogEntry(file, queue) {
  return {
    file,
    queue,
    toString() {
      return `${queue}/${file}`;
    },
  };
}

/**
 * Get catalog of processed and rejected reports to detect duplicates (task_id and sha256 hash)
 * Inspects both processed/ and rejected/ directories safely without following symlinks.
 */
export function getHistoryCatalog() {
  const catalog = {
    taskIds: new Map(), // taskId -> { file, queue, toString() }
    contentHashes: new Map(), // sha256 -> { file, queue, toString() }
  };

  const scanDir = (dirPath, queueName) => {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink() || !stat.isFile()) {
          continue; // Never follow symlinks or inspect directories
        }
        const hash = computeFileHash(fullPath);
        const entry = makeCatalogEntry(file, queueName);
        catalog.contentHashes.set(hash, entry);

        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content && typeof content === 'object' && content.task_id) {
          catalog.taskIds.set(content.task_id, entry);
        }
      } catch {
        // Ignore unparseable or inaccessible historical file in catalog
      }
    }
  };

  // Rejected reports scanned first; processed reports scanned second to give processed priority
  scanDir(DIRS.reportsRejected, 'rejected');
  scanDir(DIRS.reportsProcessed, 'processed');

  return catalog;
}

export const getProcessedCatalog = getHistoryCatalog;

/**
 * Safe file move: never overwrites existing destination files.
 * If destination exists, throws an Error to halt processing of that file.
 */
export function safeMoveFile(srcPath, destDir, fileName) {
  const destPath = path.join(destDir, fileName);
  if (fs.existsSync(destPath)) {
    throw new Error(`Destination file conflict: "${destPath}" already exists. Aborting move to prevent data loss.`);
  }
  fs.renameSync(srcPath, destPath);
  return destPath;
}

/**
 * Main function: process all pending reports one-shot
 */
export function processPendingReports() {
  log('info', '=======================================================');
  log('info', 'Antigravity Local Report Bridge: Starting Queue Run');

  // 1. Check Emergency Stop
  const stopSentinel = checkEmergencyStop();
  if (stopSentinel) {
    log('warn', `EMERGENCY STOP TRIGGERED: Sentinel file detected at "${stopSentinel}". Queue processing aborted.`);
    return { status: 'STOPPED', processed: 0, rejected: 0, conflicts: 0 };
  }

  ensureDirectories();

  let schema;
  try {
    schema = loadSchema();
  } catch (err) {
    log('error', `Failed to load schema: ${err.message}`);
    return { status: 'ERROR', message: err.message };
  }

  const pendingFiles = fs
    .readdirSync(DIRS.reportsPending)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (pendingFiles.length === 0) {
    log('info', 'No pending reports found in .automation/reports/pending/. Queue is idle.');
    return { status: 'IDLE', processed: 0, rejected: 0, conflicts: 0 };
  }

  log('info', `Found ${pendingFiles.length} pending report(s) to evaluate.`);

  const historyCatalog = getHistoryCatalog();
  const summary = {
    total: pendingFiles.length,
    processed: 0,
    rejected: 0,
    conflicts: 0,
  };

  for (const fileName of pendingFiles) {
    const filePath = path.join(DIRS.reportsPending, fileName);
    log('info', `Evaluating report file: "${fileName}"`);

    // Step 0: Symlink and file type inspection using lstat (Fix 3)
    let stat;
    try {
      stat = fs.lstatSync(filePath);
    } catch (statErr) {
      log('error', `Could not stat file "${fileName}": ${statErr.message}`);
      summary.conflicts++;
      continue;
    }

    if (stat.isSymbolicLink()) {
      log('warn', `Security violation: "${fileName}" in pending queue is a symbolic link. Skipping without following or modifying target.`);
      summary.conflicts++;
      continue;
    }

    if (!stat.isFile()) {
      log('warn', `Skipping non-regular file in pending queue: "${fileName}"`);
      summary.conflicts++;
      continue;
    }

    // Step A: Read file safely
    let rawContent;
    try {
      rawContent = fs.readFileSync(filePath, 'utf8');
    } catch (readErr) {
      log('error', `Could not read file "${fileName}": ${readErr.message}`);
      summary.conflicts++;
      continue;
    }

    // Step B: Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (jsonErr) {
      log('warn', `Malformed JSON syntax in "${fileName}": ${jsonErr.message}. Moving to rejected queue.`);
      try {
        safeMoveFile(filePath, DIRS.reportsRejected, fileName);
        summary.rejected++;
      } catch (moveErr) {
        log('error', moveErr.message);
        summary.conflicts++;
      }
      continue;
    }

    // Step C: Schema Validation
    const validationErrors = validateReportData(parsedData, schema);
    if (validationErrors.length > 0) {
      log('warn', `Schema validation failed for "${fileName}": ${validationErrors.join('; ')}. Moving to rejected queue.`);
      try {
        safeMoveFile(filePath, DIRS.reportsRejected, fileName);
        if (parsedData && parsedData.task_id) {
          historyCatalog.taskIds.set(parsedData.task_id, makeCatalogEntry(fileName, 'rejected'));
        }
        summary.rejected++;
      } catch (moveErr) {
        log('error', moveErr.message);
        summary.conflicts++;
      }
      continue;
    }

    // Step D: Duplicate Detection (task_id and content hash across processed and rejected)
    const fileHash = computeFileHash(filePath);
    if (historyCatalog.contentHashes.has(fileHash)) {
      const originalFile = historyCatalog.contentHashes.get(fileHash);
      log('warn', `Duplicate report content detected in "${fileName}". Identical to "${originalFile}". Moving to rejected.`);
      try {
        safeMoveFile(filePath, DIRS.reportsRejected, fileName);
        historyCatalog.contentHashes.set(fileHash, makeCatalogEntry(fileName, 'rejected'));
        if (parsedData && parsedData.task_id) {
          historyCatalog.taskIds.set(parsedData.task_id, makeCatalogEntry(fileName, 'rejected'));
        }
        summary.rejected++;
      } catch (moveErr) {
        log('error', moveErr.message);
        summary.conflicts++;
      }
      continue;
    }

    if (historyCatalog.taskIds.has(parsedData.task_id)) {
      const originalFile = historyCatalog.taskIds.get(parsedData.task_id);
      log('warn', `Duplicate task_id "${parsedData.task_id}" in "${fileName}". Already present in "${originalFile}". Moving to rejected.`);
      try {
        safeMoveFile(filePath, DIRS.reportsRejected, fileName);
        historyCatalog.contentHashes.set(fileHash, makeCatalogEntry(fileName, 'rejected'));
        historyCatalog.taskIds.set(parsedData.task_id, makeCatalogEntry(fileName, 'rejected'));
        summary.rejected++;
      } catch (moveErr) {
        log('error', moveErr.message);
        summary.conflicts++;
      }
      continue;
    }

    // Step E: Valid & Unique -> Move to Processed Queue safely
    try {
      safeMoveFile(filePath, DIRS.reportsProcessed, fileName);
      // Register in memory catalog
      historyCatalog.taskIds.set(parsedData.task_id, makeCatalogEntry(fileName, 'processed'));
      historyCatalog.contentHashes.set(fileHash, makeCatalogEntry(fileName, 'processed'));

      log('info', `Report "${fileName}" (Task: ${parsedData.task_id}, Status: ${parsedData.task_status}) verified and moved to processed.`);
      summary.processed++;
    } catch (moveErr) {
      log('error', `Conflict moving "${fileName}": ${moveErr.message}`);
      summary.conflicts++;
    }
  }

  log('info', 'Queue processing completed.', summary);
  return { status: 'COMPLETED', ...summary };
}

/**
 * Display Queue Status summary
 */
export function displayStatus() {
  ensureDirectories();
  const stopSentinel = checkEmergencyStop();

  const countFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length : 0);

  const pending = countFiles(DIRS.reportsPending);
  const processed = countFiles(DIRS.reportsProcessed);
  const rejected = countFiles(DIRS.reportsRejected);

  console.log('--- Antigravity Report Automation Bridge Status ---');
  console.log(`Emergency Stop:    ${stopSentinel ? `ACTIVE (Sentinel: ${stopSentinel})` : 'INACTIVE'}`);
  console.log(`Pending Reports:   ${pending}`);
  console.log(`Processed Reports: ${processed}`);
  console.log(`Rejected Reports:  ${rejected}`);
  console.log(`Log File:          ${LOG_FILE}`);
  console.log('---------------------------------------------------');
}

// CLI entry point
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const command = args[0] || '--process';

  switch (command) {
    case '--process':
    case 'process':
      processPendingReports();
      break;

    case '--status':
    case 'status':
      displayStatus();
      break;

    case '--help':
    case '-h':
      console.log('Antigravity Local Report Bridge CLI');
      console.log('Usage:');
      console.log('  node .automation/bridge.js           Process pending reports (default)');
      console.log('  node .automation/bridge.js --process Process pending reports');
      console.log('  node .automation/bridge.js --status  Display current queue status');
      console.log('  node .automation/bridge.js --help    Display this help message');
      break;

    default:
      console.error(`Unknown argument: "${command}". Run with --help for usage.`);
      process.exit(1);
  }
}
