export async function up(knex): Promise<any> {
  await knex.schema.createTable("reports", (table) => {
    table.increments("id").primary();
    table.integer("book_id").notNullable();
    table.text("type").notNullable();
    table.foreign("book_id").references("books.id");
  });

  await knex.schema.createTable("suggestions", (table) => {
    table.increments("id").primary();
    table.integer("book_id").notNullable();
    table.text("type").notNullable();
    table.boolean("accepted").defaultTo(false);
    table.text("suggestion").notNullable();
    table.foreign("book_id").references("books.id");
  });
}

export async function down(knex): Promise<any> {
  await knex.schema.dropTableIfExists("suggestions");
  await knex.schema.dropTableIfExists("reports");
}
