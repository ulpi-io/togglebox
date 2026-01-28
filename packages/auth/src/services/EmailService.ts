/**
 * Email service for transactional emails via SMTP.
 *
 * @module services/EmailService
 *
 * @remarks
 * Sends transactional emails using nodemailer:
 * - Password reset emails
 * - Welcome emails
 *
 * **Configuration:** Via environment variables or constructor config.
 */

import nodemailer from "nodemailer";
import { IEmailService } from "./PasswordResetService";
import { logger } from "@togglebox/shared";

/**
 * Email service configuration.
 */
export interface EmailServiceConfig {
  /** SMTP server hostname */
  smtpHost: string;

  /** SMTP port (587 for TLS, 465 for SSL) */
  smtpPort: number;

  /** SMTP username */
  smtpUser: string;

  /** SMTP password */
  smtpPass: string;

  /** From email address */
  fromEmail: string;

  /** From name (defaults to 'Togglebox') */
  fromName?: string;
}

/**
 * Email service using nodemailer SMTP transport.
 */
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor(config: EmailServiceConfig) {
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || "Togglebox";

    // Create SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  /**
   * Send password reset email with reset link.
   *
   * @param email - Recipient email address
   * @param token - Plaintext reset token for URL
   *
   * @remarks
   * Email includes HTML and plain text versions.
   * Reset link format: `${APP_URL}/auth/reset-password?token=${token}`
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env["APP_URL"] || "http://localhost:3000"}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: "Reset Your Password - Togglebox",
      html: this.getPasswordResetEmailTemplate(resetUrl),
      text: this.getPasswordResetEmailText(resetUrl),
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send welcome email to new user.
   *
   * @param email - Recipient email address
   * @param name - User name (defaults to email)
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: email,
      subject: "Welcome to Togglebox",
      html: this.getWelcomeEmailTemplate(name || email),
      text: this.getWelcomeEmailText(name || email),
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Password reset email HTML template
   */
  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Reset Your Password</h2>
    <p>You recently requested to reset your password for your Togglebox account.</p>
    <p>Click the button below to reset your password:</p>
    <div style="margin: 30px 0;">
      <a href="${resetUrl}"
         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="color: #666; word-break: break-all;">${resetUrl}</p>
    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
    <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">Togglebox - Remote Config Service</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Password reset email plain text version
   */
  private getPasswordResetEmailText(resetUrl: string): string {
    return `
Reset Your Password

You recently requested to reset your password for your Togglebox account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
Togglebox - Remote Config Service
    `;
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Togglebox</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Welcome to Togglebox!</h2>
    <p>Hi ${name},</p>
    <p>Thank you for signing up for Togglebox, your remote configuration service.</p>
    <p>You can now manage feature flags, configurations, and environment settings for your applications.</p>
    <p>Get started by visiting your dashboard:</p>
    <div style="margin: 30px 0;">
      <a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard"
         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Go to Dashboard
      </a>
    </div>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">Togglebox - Remote Config Service</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Welcome email plain text version
   */
  private getWelcomeEmailText(name: string): string {
    return `
Welcome to Togglebox!

Hi ${name},

Thank you for signing up for Togglebox, your remote configuration service.

You can now manage feature flags, configurations, and environment settings for your applications.

Visit your dashboard at: ${process.env["APP_URL"] || "http://localhost:3000"}/dashboard

If you have any questions, feel free to reach out to our support team.

---
Togglebox - Remote Config Service
    `;
  }

  /**
   * Verify SMTP connection.
   *
   * @returns true if connection successful
   *
   * @remarks
   * Call on application startup to verify SMTP credentials.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error("SMTP connection verification failed", error);
      return false;
    }
  }
}

/**
 * Create email service from environment variables.
 *
 * @returns Configured EmailService instance
 *
 * @remarks
 * **Environment Variables:**
 * - `SMTP_HOST` (default: smtp.gmail.com)
 * - `SMTP_PORT` (default: 587)
 * - `SMTP_USER`
 * - `SMTP_PASS`
 * - `FROM_EMAIL` (default: noreply@togglebox.com)
 * - `FROM_NAME` (default: Togglebox)
 */
export function createEmailService(): EmailService {
  const config: EmailServiceConfig = {
    smtpHost: process.env["SMTP_HOST"] || "smtp.gmail.com",
    smtpPort: parseInt(process.env["SMTP_PORT"] || "587", 10),
    smtpUser: process.env["SMTP_USER"] || "",
    smtpPass: process.env["SMTP_PASS"] || "",
    fromEmail: process.env["FROM_EMAIL"] || "noreply@togglebox.com",
    fromName: process.env["FROM_NAME"] || "Togglebox",
  };

  return new EmailService(config);
}
