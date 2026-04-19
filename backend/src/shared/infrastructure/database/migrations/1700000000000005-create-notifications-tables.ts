import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create notifications schema and tables
 */
export class CreateNotificationsTables1700000000000005
  implements MigrationInterface
{
  name = 'CreateNotificationsTables1700000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS notifications`);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE notifications.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(30) NOT NULL,
        channel VARCHAR(10) NOT NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        subject VARCHAR(500),
        content TEXT NOT NULL,
        template_id VARCHAR(100),
        template_data JSONB NOT NULL DEFAULT '{}',
        recipient_email VARCHAR(255),
        recipient_phone VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        scheduled_for TIMESTAMP,
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        failure_reason TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_user_id ON notifications.notifications (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_status ON notifications.notifications (status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_type ON notifications.notifications (type)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_scheduled_for ON notifications.notifications (scheduled_for)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_ready_to_send
        ON notifications.notifications (status, scheduled_for)
        WHERE status = 'PENDING'
    `);

    // Notification preferences table
    await queryRunner.query(`
      CREATE TABLE notifications.notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        email_enabled BOOLEAN NOT NULL DEFAULT true,
        sms_enabled BOOLEAN NOT NULL DEFAULT true,
        marketing_enabled BOOLEAN NOT NULL DEFAULT false,
        event_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
        unsubscribe_token VARCHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notification_preferences_user_id
        ON notifications.notification_preferences (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notification_preferences_unsubscribe_token
        ON notifications.notification_preferences (unsubscribe_token)
    `);

    // Notification templates table
    await queryRunner.query(`
      CREATE TABLE notifications.notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        channel VARCHAR(10) NOT NULL,
        category VARCHAR(20) NOT NULL,
        subject VARCHAR(500),
        body TEXT NOT NULL,
        required_variables JSONB NOT NULL DEFAULT '[]',
        default_variables JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notification_templates_slug
        ON notifications.notification_templates (slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS notifications.notification_templates`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS notifications.notification_preferences`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS notifications.notifications`,
    );
    await queryRunner.query(`DROP SCHEMA IF EXISTS notifications`);
  }
}
