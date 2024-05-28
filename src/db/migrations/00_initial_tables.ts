export async function up(knex): Promise<any> {
  return Promise.all([
    knex.schema.createTableIfNotExists("uploaders", (table) => {
      table.text("name").primary();
      table.text("uploader_id").notNullable();
      table.text("avatar").notNullable();
      table.text("source").notNullable();
    }),
    knex.schema.createTableIfNotExists("books", (table) => {
      table.increments("id").primary();
      table.text("uploader_id").notNullable();
      table.text("file").notNullable().unique();
      table.text("message_id");
      table.foreign("uploader_id").references("uploaders.uploader_id");
      table.timestamp("date").defaultTo(knex.fn.now());
    }),
    knex.schema.createTableIfNotExists("book_details", (table) => {
      table.increments("id").primary();
      table.integer("book_id").notNullable();
      table.text("cover_image");
      table.text("title").notNullable();
      table.text("author").notNullable();
      table.text("subject");
      table.text("description");
      table.foreign("book_id").references("books.id");
    }),
    knex.schema.createTableIfNotExists("keywords", (table) => {
      table.increments("id").primary();
      table.text("keyword").notNullable().unique();
    }),
    knex.schema.createTableIfNotExists("book_keywords", (table) => {
      table.integer("book_id").notNullable();
      table.integer("keyword_id").notNullable();
      table.primary(["book_id", "keyword_id"]);
      table.foreign("book_id").references("books.id");
      table.foreign("keyword_id").references("keywords.id");
    }),
  ]);
}

export async function down(knex): Promise<any> {
  return Promise.all([
    knex.schema.dropTableIfExists("book_keywords"),
    knex.schema.dropTableIfExists("keywords"),
    knex.schema.dropTableIfExists("book_details"),
    knex.schema.dropTableIfExists("books"),
    knex.schema.dropTableIfExists("uploaders"),
  ]);
}
