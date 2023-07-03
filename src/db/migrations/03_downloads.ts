export async function up(knex): Promise<any> {
  return knex.schema.alterTable("books", (table) => {
    table.integer("downloads").defaultTo(0);
  });
}

export async function down(knex): Promise<any> {
  return knex.schema.alterTable("books", (table) => {
    table.dropColumn("downloads");
  });
}
