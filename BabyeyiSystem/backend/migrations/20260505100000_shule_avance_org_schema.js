'use strict';

/**
 * Baseline migration for ShuleAvance org schema that was previously created
 * at runtime. Keeping it in migrations makes deploys deterministic.
 */
exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('pro_shule_avance_organizations');
  if (!hasTable) {
    await knex.schema.createTable('pro_shule_avance_organizations', (table) => {
      table.increments('id').unsigned().primary();
      table.integer('user_id').unsigned().notNullable().unique();
      table.string('org_name', 200).notNullable();
      table.string('org_type', 32).notNullable().defaultTo('INTERNAL_PARTNER');
      table.string('login_username', 120).notNullable().unique();
      table.string('contact_person', 180).nullable();
      table.string('contact_email', 180).notNullable().unique();
      table.string('contact_phone', 40).nullable();
      table.text('address').nullable();
      table.string('logo_url', 500).nullable();
      table.text('description').nullable();
      table.text('notes').nullable();
      table.boolean('is_active').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').nullable();
      table.index(['is_active'], 'idx_sa_org_active');
    });
  }

  const hasApplicantCategories = await knex.schema.hasColumn(
    'pro_shule_avance_organizations',
    'applicant_categories_json'
  );
  if (!hasApplicantCategories) {
    await knex.schema.alterTable('pro_shule_avance_organizations', (table) => {
      table.json('applicant_categories_json').nullable();
    });
  }

  const hasRatePercent = await knex.schema.hasColumn('pro_shule_avance_organizations', 'rate_percent');
  if (!hasRatePercent) {
    await knex.schema.alterTable('pro_shule_avance_organizations', (table) => {
      table.decimal('rate_percent', 7, 3).nullable();
    });
  }

  const hasRateMonthly = await knex.schema.hasColumn('pro_shule_avance_organizations', 'rate_is_monthly');
  if (!hasRateMonthly) {
    await knex.schema.alterTable('pro_shule_avance_organizations', (table) => {
      table.boolean('rate_is_monthly').notNullable().defaultTo(0);
    });
  }

  const hasDisbursement = await knex.schema.hasColumn(
    'pro_shule_avance_organizations',
    'disbursement_account_type'
  );
  if (!hasDisbursement) {
    await knex.schema.alterTable('pro_shule_avance_organizations', (table) => {
      table.string('disbursement_account_type', 24).notNullable().defaultTo('SCHOOL_ACCOUNT');
    });
  }

  await knex.raw(
    `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
     SELECT ?, ?, ?, ?, 1, 1
     WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_code = ?)`,
    [
      'ShuleAvance Partner',
      'SHULE_AVANCE_PARTNER',
      'Financing partner — reviews ShuleAvance requests routed to their organization',
      '[]',
      'SHULE_AVANCE_PARTNER',
    ]
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('pro_shule_avance_organizations');
};
