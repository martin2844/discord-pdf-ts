export async function up(knex): Promise<any> {
  return knex.schema.table("books", function (table) {
    table.boolean("blacklisted").defaultTo(false);
  });
}

export async function down(knex): Promise<any> {
  return knex.schema.table("books", function (table) {
    table.dropColumn("blacklisted");
  });
}
