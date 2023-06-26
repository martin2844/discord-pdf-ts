import { Knex } from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("ratings", (table) => {
    table.increments("id").primary();
    table.integer("book_id").unsigned().notNullable();
    table.integer("rating").notNullable();
    table.string("ip").notNullable();
    table.unique(["book_id", "ip"]); // unique constraint
    table.foreign("book_id").references("books.id");
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTableIfExists("ratings");
}
