import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/db";
import { notificationLogs, notifications } from "@/db/schema";
import crypto from "crypto";

// Use Ethereal (fake SMTP) if no real SMTP configured — emails won't leave the sandbox
// but the send result is recorded. This keeps dev/test honest.
function buildTransport(): Transporter {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
        : undefined,
    });
  }
  // In-memory mock transport — never actually sends. Logs the email content.
  return nodemailer.createTransport({
    name: "mock",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: (mail: any, callback: any) => {
      console.log(
        `[EMAIL-MOCK] to=${mail.data.to} subject="${mail.data.subject}" body=${String(mail.data.text ?? "").slice(0, 200)}`
      );
      callback(null, { messageId: `mock-${Date.now()}` });
    },
  });
}

const fromAddress =
  process.env.SMTP_FROM || "CampusConnect <no-reply@campusconnect.local>";

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  studentId?: number | null;
  recipientRole: "STUDENT" | "PARENT" | "STAFF";
  /** Fingerprint used to dedupe repeated identical notifications. */
  fingerprint: string;
  /** UserId of the intended in-app notification recipient. */
  recipientUserId: number;
}

/**
 * Sends an email AND creates an in-app notification. Uses a fingerprint-based
 * dedupe check so a repeated trigger (e.g. dashboard refresh) never results in
 * duplicate emails.
 */
export async function sendNotificationEmail(args: SendArgs): Promise<{
  sent: boolean;
  duplicate: boolean;
  reason?: string;
}> {
  // Dedupe: same fingerprint within the last 24h is suppressed
  const recent = await db.query.notificationLogs.findFirst({
    where: (log, { and, eq, gte }) =>
      and(
        eq(log.fingerprint, args.fingerprint),
        gte(log.sentAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      ),
  });
  if (recent) {
    return { sent: false, duplicate: true, reason: "fingerprint-duplicate" };
  }

  let status: "sent" | "failed" = "sent";
  let failureReason: string | null = null;
  try {
    const transport = buildTransport();
    await transport.sendMail({
      from: fromAddress,
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
  } catch (err) {
    status = "failed";
    failureReason = err instanceof Error ? err.message : String(err);
  }

  await db.insert(notificationLogs).values({
    studentId: args.studentId ?? null,
    recipientEmail: args.to,
    recipientRole: args.recipientRole,
    subject: args.subject,
    status,
    failureReason,
    fingerprint: args.fingerprint,
  });

  await db.insert(notifications).values({
    userId: args.recipientUserId,
    studentId: args.studentId ?? null,
    type: "ATTENDANCE_WARNING",
    subject: args.subject,
    message: args.text.slice(0, 500),
  });

  return { sent: status === "sent", duplicate: false, reason: failureReason ?? undefined };
}

export function makeFingerprint(parts: Array<string | number | null | undefined>): string {
  const hash = crypto.createHash("sha256");
  hash.update(parts.map((p) => String(p ?? "")).join("|"));
  return hash.digest("hex");
}
