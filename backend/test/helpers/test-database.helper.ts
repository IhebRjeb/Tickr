/**
 * Test Database Helper
 * 
 * Utilities for managing test database lifecycle:
 * - Setup: Create and migrate test database
 * - Cleanup: Clear data between tests
 * - Teardown: Drop test database after tests
 */

import { DataSource } from 'typeorm';

import { AppDataSource } from '../../src/shared/infrastructure/database/data-source';

export class TestDatabaseHelper {
  private static dataSource: DataSource;

  /**
   * Initialize database connection and run migrations
   */
  static async setup(): Promise<void> {
    try {
      this.dataSource = AppDataSource;
      
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // Run migrations
      await this.dataSource.runMigrations();
      
      console.log('✅ Test database initialized and migrations run');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Clear all data from tables (but keep schema)
   * Use this between tests to ensure clean state
   */
  static async cleanup(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      return;
    }

    try {
      const entities = this.dataSource.entityMetadatas;

      // Disable foreign key checks
      await this.dataSource.query('SET CONSTRAINTS ALL DEFERRED');

      // Truncate all tables
      for (const entity of entities) {
        const tableName = entity.tableName;
        await this.dataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
      }

      // Re-enable foreign key checks
      await this.dataSource.query('SET CONSTRAINTS ALL IMMEDIATE');
      
      console.log('🧹 Test database cleaned');
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static async teardown(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      console.log('✅ Test database connection closed');
    }
  }

  /**
   * Get the active data source
   */
  static getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Drop and recreate database (full reset)
   * WARNING: This drops all data!
   */
  static async reset(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      await this.setup();
    }

    try {
      // Drop all tables
      await this.dataSource.dropDatabase();
      
      // Recreate schema
      await this.dataSource.runMigrations();
      
      console.log('🔄 Test database reset complete');
    } catch (error) {
      console.error('❌ Failed to reset test database:', error);
      throw error;
    }
  }
}

/**
 * Global setup for Jest
 * Called once before all tests
 */
export async function globalSetup() {
  await TestDatabaseHelper.setup();
}

/**
 * Global teardown for Jest
 * Called once after all tests
 */
export async function globalTeardown() {
  await TestDatabaseHelper.teardown();
}
