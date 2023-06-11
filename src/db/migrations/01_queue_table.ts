export async function up(knex) {
  return Promise.all([
    knex.schema.createTable("book_queue", function (table) {
      table.increments("id").primary();
      table.integer("book_id").notNullable();
      table.foreign("book_id").references("books.id");
      table.timestamp("added").defaultTo(knex.fn.now());
      table.timestamp("processed").nullable();
      table.enu("status", ["pending", "complete"]).defaultTo("pending");
    }),
  ]);
}

export async function down(knex) {
  return Promise.all([knex.schema.dropTable("book_queue")]);
}
