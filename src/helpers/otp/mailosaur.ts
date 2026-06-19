import MailosaurClient from 'mailosaur';
import { mailosaurEnv } from '../../../config/env';

export interface MailosaurTestInbox {
  mailosaur: MailosaurClient;
  serverId: string;
  email: string;
}

export function mailosaurConfig(): MailosaurTestInbox {
  const { apiKey, serverId } = mailosaurEnv();
  return {
    mailosaur: new MailosaurClient(apiKey),
    serverId,
    email: `${serverId}@mailosaur.net`,
  };
}

/** Clears the inbox and returns the timestamp to search from. */
export async function resetInbox({ mailosaur, serverId }: MailosaurTestInbox): Promise<Date> {
  await mailosaur.messages.deleteAll(serverId);
  return new Date();
}

/** Polls Mailosaur for the OTP email and extracts the 5-digit verification code. */
export async function fetchOtpCode(
  { mailosaur, serverId, email }: MailosaurTestInbox,
  sentAfter: Date
): Promise<string> {
  const message = await mailosaur.messages.get(
    serverId,
    { sentTo: email },
    { receivedAfter: sentAfter, timeout: 30000 }
  );

  const codes = message.html?.codes ?? message.text?.codes ?? [];
  const otp = codes.find((c) => c.value?.length === 5)?.value ?? codes[0]?.value;
  if (!otp) {
    throw new Error('Expected to find a one-time code in the OTP email');
  }
  return otp;
}
