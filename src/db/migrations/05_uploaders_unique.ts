export async function up(knex): Promise<any> {
  return knex.schema.alterTable("uploaders", (table) => {
    table.text("uploader_id").unique().alter();
  });
}

export async function down(knex): Promise<any> {
  return knex.schema.alterTable("uploaders", (table) => {
    table.dropUnique("uploader_id");
  });
}
