import type { Pool } from "pg";

export function createGuestRepository(pool: Pool) {
  return {
    async incrementAttempts(guestId: string): Promise<number> {
      const res = await pool.query<{ whatsapp_send_attempts: number }>(
        `UPDATE guests SET whatsapp_send_attempts = whatsapp_send_attempts + 1 WHERE id = $1 RETURNING whatsapp_send_attempts`,
        [guestId]
      );
      return res.rows[0]?.whatsapp_send_attempts ?? 0;
    },

    async setError(guestId: string, error: string): Promise<void> {
      await pool.query(`UPDATE guests SET whatsapp_send_last_error = $2 WHERE id = $1`, [guestId, error]);
    },

    async markSent(guestId: string, messageId: string | null): Promise<void> {
      await pool.query(
        `UPDATE guests SET whatsapp_message_id = $2, status = 'sent', whatsapp_send_last_error = NULL, whatsapp_send_enqueued_at = NULL WHERE id = $1`,
        [guestId, messageId]
      );
    },

    async markFailed(guestId: string, error: string): Promise<void> {
      await pool.query(
        `UPDATE guests SET status = 'failed', whatsapp_send_last_error = $2, whatsapp_send_enqueued_at = NULL WHERE id = $1`,
        [guestId, error]
      );
    },
  };
}

export type GuestRepository = ReturnType<typeof createGuestRepository>;
