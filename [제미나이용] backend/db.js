const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite',
  },
  useNullAsDefault: true,
});

async function setupDatabase() {
  const hasProjectsTable = await knex.schema.hasTable('projects');
  if (!hasProjectsTable) {
    await knex.schema.createTable('projects', (table) => {
      table.increments('id').primary();
      table.string('name');
      table.timestamp('createdDate').defaultTo(knex.fn.now());
    });
    console.log("'projects' table created.");
  }

  const hasParticipantsTable = await knex.schema.hasTable('participants');
  if (!hasParticipantsTable) {
      await knex.schema.createTable('participants', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('project_id').unsigned().references('id').inTable('projects');
      });
      console.log("'participants' table created.");
  }

  const hasExpensesTable = await knex.schema.hasTable('expenses');
  if (!hasExpensesTable) {
      await knex.schema.createTable('expenses', (table) => {
          table.increments('id').primary();
          table.string('desc');
          table.integer('amount');
          table.integer('project_id').unsigned().references('id').inTable('projects');
          table.integer('payerId').unsigned().references('id').inTable('participants');
      });
      console.log("'expenses' table created.");
  }
}

setupDatabase();

module.exports = knex;