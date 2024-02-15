import knex from 'knex'

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: './docs.db',
  },
  useNullAsDefault: true,
})

const init = async () => {
  {
    const exists = await db.schema.hasTable('items')
    if (!exists) {
      await db.schema.createTable('items', table => {
        table.string('id').primary()
        table.string('name')
        table.string('desc')
        table.integer('version')
      })
      console.log('created items table')
    }
  }
  {
    const exists = await db.schema.hasTable('todos')
    if (!exists) {
      await db.schema.createTable('todos', table => {
        table.string('id').primary()
        table.string('text')
      })
      console.log('created todos table')
    }
  }
}
init()

export { db }
