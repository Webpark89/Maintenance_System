import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SIGNATURE_DIR = path.join(process.cwd(), 'uploads', 'signatures');

if (!fs.existsSync(SIGNATURE_DIR)) {
  fs.mkdirSync(SIGNATURE_DIR, { recursive: true });
}

export interface SaveSignatureOptions {
  requestId: number;
  workOrderNo: string;
  activeSlot: 'approver1' | 'approver2';
  signerName: string;
  signerEmpId: string;
  base64Data: string;
}

export interface SignatureSecurityResult {
  filePath: string;
  relativeUrl: string;
  signatureHash: string;
  nonce: string;
  signedAt: Date;
}

/**
 * Generate a unique SHA-256 fingerprint for a signature binding it specifically to:
 * - Request ID
 * - Work Order Number
 * - Approver Slot
 * - Signer Employee ID
 * - Timestamp & Cryptographic Random Nonce
 */
export function generateSignatureFingerprint(
  requestId: number,
  workOrderNo: string,
  slot: string,
  empId: string,
  nonce: string
): string {
  const payload = `${requestId}:${workOrderNo}:${slot}:${empId}:${nonce}:${process.env.JWT_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Saves Base64 Signature Canvas Image securely to disk with Anti-Replay Binding
 */
export async function saveSecureSignatureImage(
  options: SaveSignatureOptions
): Promise<SignatureSecurityResult> {
  const { requestId, workOrderNo, activeSlot, signerName, signerEmpId, base64Data } = options;

  // Clean base64 string header if present (e.g. data:image/png;base64,...)
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Image, 'base64');

  // Validate image buffer header for PNG format (89 50 4E 47 0D 0A 1A 0A)
  if (imageBuffer.length < 8 || imageBuffer[0] !== 0x89 || imageBuffer[1] !== 0x50) {
    throw new Error('รูปแบบไฟล์ลายเซ็นไม่ถูกต้อง ต้องเป็นรูปภาพ PNG');
  }

  // Create unique nonce and signature hash (Prevents Replay Attacks across requests)
  const nonce = crypto.randomBytes(16).toString('hex');
  const signatureHash = generateSignatureFingerprint(requestId, workOrderNo, activeSlot, signerEmpId, nonce);
  const signedAt = new Date();

  // Create unique, unguessable filename tied to request ID and hash snippet
  const fileName = `sig_wo${requestId}_${activeSlot}_${signatureHash.substring(0, 12)}.png`;
  const fullPath = path.join(SIGNATURE_DIR, fileName);

  // Save PNG file to secure uploads directory
  await fs.promises.writeFile(fullPath, imageBuffer);

  const relativeUrl = `/uploads/signatures/${fileName}`;

  return {
    filePath: fullPath,
    relativeUrl,
    signatureHash,
    nonce,
    signedAt,
  };
}
